<?php
/**
 * Profile Model
 */

require_once BASE_PATH . '/config/database.php';

class Profile {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($userId) {
        $sql = "INSERT INTO profiles (user_id, created_at) VALUES (?, NOW())";
        return $this->db->insert($sql, [$userId]);
    }
    
    public function findByUserId($userId) {
        $sql = "SELECT * FROM profiles WHERE user_id = ?";
        return $this->db->fetchOne($sql, [$userId]);
    }
    
    public function update($userId, $data) {
        $fields = [];
        $values = [];
        
        $allowedFields = ['bio', 'headline', 'location', 'website', 'linkedin', 
                          'github', 'experience_years', 'expected_salary', 'resume_path'];
        
        foreach ($data as $key => $value) {
            if (in_array($key, $allowedFields)) {
                $fields[] = "$key = ?";
                $values[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $values[] = $userId;
        $sql = "UPDATE profiles SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE user_id = ?";
        return $this->db->update($sql, $values);
    }
    
    public function addExperience($userId, $data) {
        $sql = "INSERT INTO profile_experience (user_id, company, position, description, start_date, end_date, is_current, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
        return $this->db->insert($sql, [
            $userId,
            $data['company'],
            $data['position'],
            $data['description'] ?? null,
            $data['start_date'],
            $data['end_date'] ?? null,
            $data['is_current'] ?? 0
        ]);
    }
    
    public function addEducation($userId, $data) {
        $sql = "INSERT INTO profile_education (user_id, institution, degree, field_of_study, start_date, end_date, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, NOW())";
        return $this->db->insert($sql, [
            $userId,
            $data['institution'],
            $data['degree'],
            $data['field_of_study'],
            $data['start_date'],
            $data['end_date'] ?? null
        ]);
    }
    
    public function addSkill($userId, $skillData) {
        $sql = "INSERT INTO profile_skills (user_id, skill_name, proficiency_level, created_at) 
                VALUES (?, ?, ?, NOW())";
        return $this->db->insert($sql, [
            $userId,
            $skillData['skill_name'],
            $skillData['proficiency_level'] ?? 'intermediate'
        ]);
    }
    
    public function getExperience($userId) {
        $sql = "SELECT * FROM profile_experience WHERE user_id = ? ORDER BY start_date DESC";
        return $this->db->fetchAll($sql, [$userId]);
    }
    
    public function getEducation($userId) {
        $sql = "SELECT * FROM profile_education WHERE user_id = ? ORDER BY start_date DESC";
        return $this->db->fetchAll($sql, [$userId]);
    }
    
    public function getSkills($userId) {
        $sql = "SELECT * FROM profile_skills WHERE user_id = ?";
        return $this->db->fetchAll($sql, [$userId]);
    }
}
