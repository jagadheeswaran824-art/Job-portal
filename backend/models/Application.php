<?php
/**
 * Application Model
 */

require_once BASE_PATH . '/config/database.php';

class Application {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($data) {
        $sql = "INSERT INTO applications (user_id, job_id, cover_letter, resume_path, status, created_at) 
                VALUES (?, ?, ?, ?, 'pending', NOW())";
        return $this->db->insert($sql, [
            $data['user_id'],
            $data['job_id'],
            $data['cover_letter'] ?? null,
            $data['resume_path'] ?? null
        ]);
    }
    
    public function findById($id) {
        $sql = "SELECT a.*, j.title as job_title, j.company_name, u.full_name as applicant_name, u.email as applicant_email
                FROM applications a
                JOIN jobs j ON a.job_id = j.id
                JOIN users u ON a.user_id = u.id
                WHERE a.id = ?";
        return $this->db->fetchOne($sql, [$id]);
    }
    
    public function update($id, $data) {
        $fields = [];
        $values = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['cover_letter', 'status', 'notes'])) {
                $fields[] = "$key = ?";
                $values[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $values[] = $id;
        $sql = "UPDATE applications SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = ?";
        return $this->db->update($sql, $values);
    }
    
    public function delete($id) {
        $sql = "DELETE FROM applications WHERE id = ?";
        return $this->db->delete($sql, [$id]);
    }
    
    public function getByUser($userId, $page = 1, $perPage = 20) {
        $offset = ($page - 1) * $perPage;
        
        $countSql = "SELECT COUNT(*) as total FROM applications WHERE user_id = ?";
        $totalResult = $this->db->fetchOne($countSql, [$userId]);
        $total = $totalResult['total'];
        
        $sql = "SELECT a.*, j.title as job_title, j.company_name, j.location
                FROM applications a
                JOIN jobs j ON a.job_id = j.id
                WHERE a.user_id = ?
                ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
        
        $applications = $this->db->fetchAll($sql, [$userId, $perPage, $offset]);
        
        return [
            'data' => $applications,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }
    
    public function getByJob($jobId, $page = 1, $perPage = 20) {
        $offset = ($page - 1) * $perPage;
        
        $countSql = "SELECT COUNT(*) as total FROM applications WHERE job_id = ?";
        $totalResult = $this->db->fetchOne($countSql, [$jobId]);
        $total = $totalResult['total'];
        
        $sql = "SELECT a.*, u.full_name as applicant_name, u.email as applicant_email, u.phone
                FROM applications a
                JOIN users u ON a.user_id = u.id
                WHERE a.job_id = ?
                ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
        
        $applications = $this->db->fetchAll($sql, [$jobId, $perPage, $offset]);
        
        return [
            'data' => $applications,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }
    
    public function checkDuplicate($userId, $jobId) {
        $sql = "SELECT id FROM applications WHERE user_id = ? AND job_id = ?";
        $result = $this->db->fetchOne($sql, [$userId, $jobId]);
        return $result !== false;
    }
    
    public function updateStatus($id, $status) {
        $sql = "UPDATE applications SET status = ?, updated_at = NOW() WHERE id = ?";
        return $this->db->update($sql, [$status, $id]);
    }
}
