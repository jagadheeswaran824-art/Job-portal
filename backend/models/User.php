<?php
/**
 * User Model
 */

require_once BASE_PATH . '/config/database.php';

class User {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($data) {
        $sql = "INSERT INTO users (email, password, full_name, role, status, created_at) 
                VALUES (?, ?, ?, ?, 'active', NOW())";
        return $this->db->insert($sql, [
            $data['email'],
            $data['password'],
            $data['full_name'],
            $data['role'] ?? 'job_seeker'
        ]);
    }
    
    public function findById($id) {
        $sql = "SELECT id, email, full_name, role, phone, avatar, status, email_verified_at, created_at, updated_at 
                FROM users WHERE id = ?";
        return $this->db->fetchOne($sql, [$id]);
    }
    
    public function findByEmail($email) {
        $sql = "SELECT * FROM users WHERE email = ?";
        return $this->db->fetchOne($sql, [$email]);
    }
    
    public function update($id, $data) {
        $fields = [];
        $values = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['full_name', 'phone', 'avatar', 'status'])) {
                $fields[] = "$key = ?";
                $values[] = $value;
            }
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $values[] = $id;
        $sql = "UPDATE users SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = ?";
        return $this->db->update($sql, $values);
    }
    
    public function delete($id) {
        $sql = "DELETE FROM users WHERE id = ?";
        return $this->db->delete($sql, [$id]);
    }
    
    public function getAll($page = 1, $perPage = 20, $filters = []) {
        $offset = ($page - 1) * $perPage;
        $where = ['1=1'];
        $params = [];
        
        if (!empty($filters['search'])) {
            $where[] = "(email LIKE ? OR full_name LIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
        }
        
        if (!empty($filters['role'])) {
            $where[] = "role = ?";
            $params[] = $filters['role'];
        }
        
        if (!empty($filters['status'])) {
            $where[] = "status = ?";
            $params[] = $filters['status'];
        }
        
        $whereSql = implode(' AND ', $where);
        
        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM users WHERE $whereSql";
        $totalResult = $this->db->fetchOne($countSql, $params);
        $total = $totalResult['total'];
        
        // Get paginated results
        $sql = "SELECT id, email, full_name, role, phone, avatar, status, created_at 
                FROM users WHERE $whereSql ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $params[] = $perPage;
        $params[] = $offset;
        
        $users = $this->db->fetchAll($sql, $params);
        
        return [
            'data' => $users,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }
    
    public function verifyEmail($id) {
        $sql = "UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = ?";
        return $this->db->update($sql, [$id]);
    }
    
    public function updatePassword($id, $password) {
        $sql = "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?";
        return $this->db->update($sql, [$password, $id]);
    }
    
    public function setStatus($id, $status) {
        $sql = "UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?";
        return $this->db->update($sql, [$status, $id]);
    }
}
