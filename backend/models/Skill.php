<?php
/**
 * Skill Model
 */

require_once BASE_PATH . '/config/database.php';

class Skill {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($name, $category = null) {
        $sql = "INSERT INTO skills (name, category, created_at) VALUES (?, ?, NOW())";
        return $this->db->insert($sql, [$name, $category]);
    }
    
    public function findById($id) {
        $sql = "SELECT * FROM skills WHERE id = ?";
        return $this->db->fetchOne($sql, [$id]);
    }
    
    public function findByName($name) {
        $sql = "SELECT * FROM skills WHERE name = ?";
        return $this->db->fetchOne($sql, [$name]);
    }
    
    public function getAll() {
        $sql = "SELECT * FROM skills ORDER BY name ASC";
        return $this->db->fetchAll($sql);
    }
    
    public function getPopular($limit = 20) {
        $sql = "SELECT s.*, COUNT(ps.id) as usage_count 
                FROM skills s
                LEFT JOIN profile_skills ps ON s.id = ps.skill_id
                GROUP BY s.id
                ORDER BY usage_count DESC
                LIMIT ?";
        return $this->db->fetchAll($sql, [$limit]);
    }
}
