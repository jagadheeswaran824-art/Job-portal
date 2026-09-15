<?php
/**
 * Notification Model
 */

require_once BASE_PATH . '/config/database.php';

class Notification {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($data) {
        $sql = "INSERT INTO notifications (user_id, type, title, message, data, is_read, created_at) 
                VALUES (?, ?, ?, ?, ?, 0, NOW())";
        return $this->db->insert($sql, [
            $data['user_id'],
            $data['type'],
            $data['title'],
            $data['message'],
            json_encode($data['data'] ?? [])
        ]);
    }
    
    public function findById($id) {
        $sql = "SELECT * FROM notifications WHERE id = ?";
        return $this->db->fetchOne($sql, [$id]);
    }
    
    public function getByUser($userId, $page = 1, $perPage = 20) {
        $offset = ($page - 1) * $perPage;
        
        $countSql = "SELECT COUNT(*) as total FROM notifications WHERE user_id = ?";
        $totalResult = $this->db->fetchOne($countSql, [$userId]);
        $total = $totalResult['total'];
        
        $sql = "SELECT * FROM notifications WHERE user_id = ? 
                ORDER BY is_read ASC, created_at DESC LIMIT ? OFFSET ?";
        
        $notifications = $this->db->fetchAll($sql, [$userId, $perPage, $offset]);
        
        return [
            'data' => $notifications,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }
    
    public function markAsRead($id) {
        $sql = "UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?";
        return $this->db->update($sql, [$id]);
    }
    
    public function markAllAsRead($userId) {
        $sql = "UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0";
        return $this->db->update($sql, [$userId]);
    }
    
    public function delete($id) {
        $sql = "DELETE FROM notifications WHERE id = ?";
        return $this->db->delete($sql, [$id]);
    }
    
    public function clearAll($userId) {
        $sql = "DELETE FROM notifications WHERE user_id = ?";
        return $this->db->delete($sql, [$userId]);
    }
    
    public function getUnreadCount($userId) {
        $sql = "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0";
        $result = $this->db->fetchOne($sql, [$userId]);
        return $result['count'] ?? 0;
    }
}
