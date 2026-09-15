<?php
/**
 * Application Controller
 * Handles job application operations
 */

require_once BASE_PATH . '/services/ApplicationService.php';
require_once BASE_PATH . '/validators/ApplicationValidator.php';
require_once BASE_PATH . '/utils/Response.php';

class ApplicationController {
    private $applicationService;
    private $validator;
    
    public function __construct() {
        $this->applicationService = new ApplicationService();
        $this->validator = new ApplicationValidator();
    }
    
    public function index() {
        try {
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            $result = $this->applicationService->getAll($page, $perPage);
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function show($id) {
        try {
            $application = $this->applicationService->getById($id);
            if (!$application) {
                throw new NotFoundException('Application not found');
            }
            return Response::success($application);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 404);
        }
    }
    
    public function create() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $data = json_decode(file_get_contents('php://input'), true);
            $data['user_id'] = $userId;
            
            $errors = $this->validator->validateCreate($data);
            if (!empty($errors)) {
                return Response::validationError($errors);
            }
            
            $application = $this->applicationService->create($data);
            return Response::success($application, 'Application submitted successfully', 201);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function update($id) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $application = $this->applicationService->update($id, $data);
            return Response::success($application, 'Application updated successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function delete($id) {
        try {
            $this->applicationService->delete($id);
            return Response::success(null, 'Application deleted successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function updateStatus($id) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $status = $data['status'] ?? null;
            $this->applicationService->updateStatus($id, $status);
            return Response::success(null, 'Application status updated');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function myApplications() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            $result = $this->applicationService->getByUser($userId, $page, $perPage);
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function byJob($jobId) {
        try {
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            $result = $this->applicationService->getByJob($jobId, $page, $perPage);
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function withdraw($id) {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $this->applicationService->withdraw($id, $userId);
            return Response::success(null, 'Application withdrawn successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function timeline($id) {
        try {
            $timeline = $this->applicationService->getTimeline($id);
            return Response::success($timeline);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function shortlist($id) {
        try {
            $this->applicationService->shortlist($id);
            return Response::success(null, 'Candidate shortlisted');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function reject($id) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $reason = $data['reason'] ?? null;
            $this->applicationService->reject($id, $reason);
            return Response::success(null, 'Application rejected');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function scheduleInterview($id) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $this->applicationService->scheduleInterview($id, $data);
            return Response::success(null, 'Interview scheduled');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
