<?php
/**
 * Admin Controller
 */

require_once BASE_PATH . '/services/AdminService.php';
require_once BASE_PATH . '/utils/Response.php';

class AdminController {
    private $adminService;
    
    public function __construct() {
        $this->adminService = new AdminService();
    }
    
    public function users() {
        try {
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            $filters = $_GET;
            $result = $this->adminService->getUsers($page, $perPage, $filters);
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function userDetails($id) {
        try {
            $user = $this->adminService->getUserDetails($id);
            return Response::success($user);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 404);
        }
    }
    
    public function banUser($id) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $reason = $data['reason'] ?? null;
            $this->adminService->banUser($id, $reason);
            return Response::success(null, 'User banned successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function unbanUser($id) {
        try {
            $this->adminService->unbanUser($id);
            return Response::success(null, 'User unbanned successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function deleteUser($id) {
        try {
            $this->adminService->deleteUser($id);
            return Response::success(null, 'User deleted successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function jobs() {
        try {
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            $filters = $_GET;
            $result = $this->adminService->getJobs($page, $perPage, $filters);
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function approveJob($id) {
        try {
            $this->adminService->approveJob($id);
            return Response::success(null, 'Job approved');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function rejectJob($id) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $reason = $data['reason'] ?? null;
            $this->adminService->rejectJob($id, $reason);
            return Response::success(null, 'Job rejected');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function deleteJob($id) {
        try {
            $this->adminService->deleteJob($id);
            return Response::success(null, 'Job deleted');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function analyticsOverview() {
        try {
            $analytics = $this->adminService->getAnalyticsOverview();
            return Response::success($analytics);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function userAnalytics() {
        try {
            $period = $_GET['period'] ?? '30';
            $analytics = $this->adminService->getUserAnalytics($period);
            return Response::success($analytics);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function jobAnalytics() {
        try {
            $period = $_GET['period'] ?? '30';
            $analytics = $this->adminService->getJobAnalytics($period);
            return Response::success($analytics);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function applicationAnalytics() {
        try {
            $period = $_GET['period'] ?? '30';
            $analytics = $this->adminService->getApplicationAnalytics($period);
            return Response::success($analytics);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function generateReport() {
        try {
            $type = $_GET['type'] ?? 'general';
            $format = $_GET['format'] ?? 'json';
            $report = $this->adminService->generateReport($type, $format);
            return Response::success($report);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function getSettings() {
        try {
            $settings = $this->adminService->getSettings();
            return Response::success($settings);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function updateSettings() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $this->adminService->updateSettings($data);
            return Response::success(null, 'Settings updated');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function flaggedContent() {
        try {
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            $result = $this->adminService->getFlaggedContent($page, $perPage);
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function moderateContent($type, $id) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $action = $data['action'] ?? null;
            $this->adminService->moderateContent($type, $id, $action);
            return Response::success(null, 'Content moderated');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
