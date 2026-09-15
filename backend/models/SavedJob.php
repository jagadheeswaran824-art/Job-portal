<?php
/**
 * SavedJob Model
 */

require_once BASE_PATH . '/config/database.php';

class SavedJob {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function save($userId, $jobId) {
        $sql = "INSERT INTO saved_jobs (user_id, job_id, created_at) VALUES (?, ?, NOW())";
        return $this->db->insert($sql, [$userId, $jobId]);
    }
    
    public function unsave($userId, $jobId) {
        $sql = "DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?";
        return $this->db->delete($sql, [$userId, $jobId]);
    }
    
    public function isSaved($userId, $jobId) {
        $sql = "SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?";
        $result = $this->db->fetchOne($sql, [$userId, $jobId]);
        return $result !== false;
    }
    
    public function getByUser($userId, $page = 1, $perPage = 20) {
        $offset = ($page - 1) * $perPage;
        
        $countSql = "SELECT COUNT(*) as total FROM saved_jobs WHERE user_id = ?";
        $totalResult = $this->db->fetchOne($countSql, [$userId]);
        $total = $totalResult['total'];
        
        $sql = "SELECT sj.*, j.title, j.company_name, j.location, j.job_type, j.salary_min, j.salary_max
                FROM saved_jobs sj
                JOIN jobs j ON sj.job_id = j.id
                WHERE sj.user_id = ?
                ORDER BY sj.created_at DESC LIMIT ? OFFSET ?";
        
        $savedJobs = $this->db->fetchAll($sql, [$userId, $perPage, $offset]);
        
        return [
            'data' => $savedJobs,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }
    
    public function getCount($userId) {
        $sql = "SELECT COUNT(*) as count FROM saved_jobs WHERE user_id = ?";
        $result = $this->db->fetchOne($sql, [$userId]);
        return $result['count'] ?? 0;
    }
}
