<?php
/**
 * Dashboard Controller
 */

require_once BASE_PATH . '/services/DashboardService.php';
require_once BASE_PATH . '/utils/Response.php';

class DashboardController {
    private $dashboardService;
    
    public function __construct() {
        $this->dashboardService = new DashboardService();
    }
    
    public function stats() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $userRole = $_REQUEST['user_role'] ?? null;
            $stats = $this->dashboardService->getStats($userId, $userRole);
            return Response::success($stats);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function recentActivity() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $limit = $_GET['limit'] ?? 10;
            $activity = $this->dashboardService->getRecentActivity($userId, $limit);
            return Response::success($activity);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function analytics() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $userRole = $_REQUEST['user_role'] ?? null;
            $period = $_GET['period'] ?? '30'; // days
            $analytics = $this->dashboardService->getAnalytics($userId, $userRole, $period);
            return Response::success($analytics);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function jobSeekerOverview() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $overview = $this->dashboardService->getJobSeekerOverview($userId);
            return Response::success($overview);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function jobRecommendations() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $limit = $_GET['limit'] ?? 10;
            $recommendations = $this->dashboardService->getJobRecommendations($userId, $limit);
            return Response::success($recommendations);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function applicationStatus() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $status = $this->dashboardService->getApplicationStatus($userId);
            return Response::success($status);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function employerOverview() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $overview = $this->dashboardService->getEmployerOverview($userId);
            return Response::success($overview);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function jobPerformance() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $performance = $this->dashboardService->getJobPerformance($userId);
            return Response::success($performance);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function applicantStats() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $stats = $this->dashboardService->getApplicantStats($userId);
            return Response::success($stats);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
}
