<?php
/**
 * Notification Controller
 */

require_once BASE_PATH . '/services/NotificationService.php';
require_once BASE_PATH . '/utils/Response.php';

class NotificationController {
    private $notificationService;
    
    public function __construct() {
        $this->notificationService = new NotificationService();
    }
    
    public function index() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            $result = $this->notificationService->getByUser($userId, $page, $perPage);
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function show($id) {
        try {
            $notification = $this->notificationService->getById($id);
            return Response::success($notification);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 404);
        }
    }
    
    public function markAsRead($id) {
        try {
            $this->notificationService->markAsRead($id);
            return Response::success(null, 'Notification marked as read');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function markAllAsRead() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $this->notificationService->markAllAsRead($userId);
            return Response::success(null, 'All notifications marked as read');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function delete($id) {
        try {
            $this->notificationService->delete($id);
            return Response::success(null, 'Notification deleted');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function clearAll() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $this->notificationService->clearAll($userId);
            return Response::success(null, 'All notifications cleared');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function unreadCount() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $count = $this->notificationService->getUnreadCount($userId);
            return Response::success(['count' => $count]);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function getSettings() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $settings = $this->notificationService->getSettings($userId);
            return Response::success($settings);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function updateSettings() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $data = json_decode(file_get_contents('php://input'), true);
            $this->notificationService->updateSettings($userId, $data);
            return Response::success(null, 'Settings updated successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
