<?php
/**
 * Job Model
 */

require_once BASE_PATH . '/config/database.php';

class Job {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($data) {
        $sql = "INSERT INTO jobs (user_id, title, description, company_name, location, job_type, 
                category, experience_level, salary_min, salary_max, skills, requirements, 
                benefits, application_deadline, status, is_featured, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, NOW())";
        return $this->db->insert($sql, [
            $data['user_id'],
            $data['title'],
            $data['description'],
            $data['company_name'],
            $data['location'],
            $data['job_type'],
            $data['category'],
            $data['experience_level'],
            $data['salary_min'] ?? null,
            $data['salary_max'] ?? null,
            json_encode($data['skills'] ?? []),
            $data['requirements'] ?? null,
            $data['benefits'] ?? null,
            $data['application_deadline'] ?? null
        ]);
    }
    
    public function findById($id) {
        $sql = "SELECT j.*, u.full_name as employer_name, u.email as employer_email,
                (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as applications_count
                FROM jobs j 
                LEFT JOIN users u ON j.user_id = u.id 
                WHERE j.id = ?";
        return $this->db->fetchOne($sql, [$id]);
    }
    
    public function update($id, $data) {
        $fields = [];
        $values = [];
        
        $allowedFields = ['title', 'description', 'location', 'job_type', 'category', 
                          'experience_level', 'salary_min', 'salary_max', 'requirements', 
                          'benefits', 'application_deadline', 'status'];
        
        foreach ($data as $key => $value) {
            if (in_array($key, $allowedFields)) {
                $fields[] = "$key = ?";
                $values[] = $value;
            }
        }
        
        if (isset($data['skills'])) {
            $fields[] = "skills = ?";
            $values[] = json_encode($data['skills']);
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $values[] = $id;
        $sql = "UPDATE jobs SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = ?";
        return $this->db->update($sql, $values);
    }
    
    public function delete($id) {
        $sql = "DELETE FROM jobs WHERE id = ?";
        return $this->db->delete($sql, [$id]);
    }
    
    public function getAll($page = 1, $perPage = 20, $filters = []) {
        $offset = ($page - 1) * $perPage;
        $where = ["j.status = 'active'"];
        $params = [];
        
        if (!empty($filters['category'])) {
            $where[] = "j.category = ?";
            $params[] = $filters['category'];
        }
        
        if (!empty($filters['location'])) {
            $where[] = "j.location LIKE ?";
            $params[] = '%' . $filters['location'] . '%';
        }
        
        if (!empty($filters['job_type'])) {
            $where[] = "j.job_type = ?";
            $params[] = $filters['job_type'];
        }
        
        if (!empty($filters['experience_level'])) {
            $where[] = "j.experience_level = ?";
            $params[] = $filters['experience_level'];
        }
        
        $whereSql = implode(' AND ', $where);
        
        $countSql = "SELECT COUNT(*) as total FROM jobs j WHERE $whereSql";
        $totalResult = $this->db->fetchOne($countSql, $params);
        $total = $totalResult['total'];
        
        $sql = "SELECT j.*, u.full_name as employer_name,
                (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as applications_count
                FROM jobs j 
                LEFT JOIN users u ON j.user_id = u.id 
                WHERE $whereSql 
                ORDER BY j.is_featured DESC, j.created_at DESC 
                LIMIT ? OFFSET ?";
        $params[] = $perPage;
        $params[] = $offset;
        
        $jobs = $this->db->fetchAll($sql, $params);
        
        return [
            'data' => $jobs,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }
    
    public function search($query, $page = 1, $perPage = 20) {
        $offset = ($page - 1) * $perPage;
        $searchTerm = '%' . $query . '%';
        
        $where = "(j.title LIKE ? OR j.description LIKE ? OR j.company_name LIKE ?) AND j.status = 'active'";
        $params = [$searchTerm, $searchTerm, $searchTerm];
        
        $countSql = "SELECT COUNT(*) as total FROM jobs j WHERE $where";
        $totalResult = $this->db->fetchOne($countSql, $params);
        $total = $totalResult['total'];
        
        $sql = "SELECT j.*, u.full_name as employer_name FROM jobs j 
                LEFT JOIN users u ON j.user_id = u.id 
                WHERE $where ORDER BY j.created_at DESC LIMIT ? OFFSET ?";
        $params[] = $perPage;
        $params[] = $offset;
        
        $jobs = $this->db->fetchAll($sql, $params);
        
        return [
            'data' => $jobs,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }
    
    public function getFeatured($limit = 10) {
        $sql = "SELECT j.*, u.full_name as employer_name FROM jobs j 
                LEFT JOIN users u ON j.user_id = u.id 
                WHERE j.is_featured = 1 AND j.status = 'active' 
                ORDER BY j.created_at DESC LIMIT ?";
        return $this->db->fetchAll($sql, [$limit]);
    }
    
    public function getByUser($userId, $page = 1, $perPage = 20) {
        $offset = ($page - 1) * $perPage;
        
        $countSql = "SELECT COUNT(*) as total FROM jobs WHERE user_id = ?";
        $totalResult = $this->db->fetchOne($countSql, [$userId]);
        $total = $totalResult['total'];
        
        $sql = "SELECT j.*, 
                (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as applications_count
                FROM jobs j WHERE j.user_id = ? 
                ORDER BY j.created_at DESC LIMIT ? OFFSET ?";
        
        $jobs = $this->db->fetchAll($sql, [$userId, $perPage, $offset]);
        
        return [
            'data' => $jobs,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }
    
    public function incrementViews($id) {
        $sql = "UPDATE jobs SET views = views + 1 WHERE id = ?";
        return $this->db->update($sql, [$id]);
    }
    
    public function setFeatured($id, $featured = true) {
        $sql = "UPDATE jobs SET is_featured = ?, updated_at = NOW() WHERE id = ?";
        return $this->db->update($sql, [$featured ? 1 : 0, $id]);
    }
}
