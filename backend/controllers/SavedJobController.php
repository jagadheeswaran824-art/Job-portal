<?php
/**
 * Saved Job Controller
 */

require_once BASE_PATH . '/services/SavedJobService.php';
require_once BASE_PATH . '/utils/Response.php';

class SavedJobController {
    private $savedJobService;
    
    public function __construct() {
        $this->savedJobService = new SavedJobService();
    }
    
    public function index() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            $result = $this->savedJobService->getByUser($userId, $page, $perPage);
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function save() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $data = json_decode(file_get_contents('php://input'), true);
            $jobId = $data['job_id'] ?? null;
            
            if (!$jobId) {
                throw new ValidationException('Job ID is required');
            }
            
            $this->savedJobService->save($userId, $jobId);
            return Response::success(null, 'Job saved successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function unsave($jobId) {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $this->savedJobService->unsave($userId, $jobId);
            return Response::success(null, 'Job removed from saved list');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function isSaved($jobId) {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $isSaved = $this->savedJobService->isSaved($userId, $jobId);
            return Response::success(['is_saved' => $isSaved]);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function count() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $count = $this->savedJobService->getCount($userId);
            return Response::success(['count' => $count]);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
}
