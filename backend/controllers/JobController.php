<?php
/**
 * Job Controller
 * Handles job listing operations
 */

require_once BASE_PATH . '/services/JobService.php';
require_once BASE_PATH . '/validators/JobValidator.php';
require_once BASE_PATH . '/utils/Response.php';
require_once BASE_PATH . '/utils/Pagination.php';

class JobController {
    private $jobService;
    private $validator;
    
    public function __construct() {
        $this->jobService = new JobService();
        $this->validator = new JobValidator();
    }
    
    /**
     * Get all jobs (paginated)
     * GET /api/jobs
     */
    public function index() {
        try {
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            $filters = [
                'category' => $_GET['category'] ?? null,
                'location' => $_GET['location'] ?? null,
                'job_type' => $_GET['job_type'] ?? null,
                'experience_level' => $_GET['experience_level'] ?? null,
                'salary_min' => $_GET['salary_min'] ?? null,
                'salary_max' => $_GET['salary_max'] ?? null,
                'status' => $_GET['status'] ?? 'active'
            ];
            
            $result = $this->jobService->getAll($page, $perPage, $filters);
            
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Get job by ID
     * GET /api/jobs/{id}
     */
    public function show($id) {
        try {
            $job = $this->jobService->getById($id);
            
            if (!$job) {
                throw new NotFoundException('Job not found');
            }
            
            // Increment view count
            $this->jobService->incrementViews($id);
            
            return Response::success($job);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 404);
        }
    }
    
    /**
     * Create new job
     * POST /api/jobs
     */
    public function create() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $userRole = $_REQUEST['user_role'] ?? null;
            
            if ($userRole !== 'employer' && $userRole !== 'admin') {
                throw new AuthorizationException('Only employers can post jobs');
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            $data['user_id'] = $userId;
            
            // Validate input
            $errors = $this->validator->validateCreate($data);
            if (!empty($errors)) {
                return Response::validationError($errors);
            }
            
            $job = $this->jobService->create($data);
            
            return Response::success($job, 'Job posted successfully', 201);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * Update job
     * PUT /api/jobs/{id}
     */
    public function update($id) {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $userRole = $_REQUEST['user_role'] ?? null;
            
            // Check ownership
            $job = $this->jobService->getById($id);
            if (!$job) {
                throw new NotFoundException('Job not found');
            }
            
            if ($job['user_id'] != $userId && $userRole !== 'admin') {
                throw new AuthorizationException('You do not have permission to update this job');
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate input
            $errors = $this->validator->validateUpdate($data);
            if (!empty($errors)) {
                return Response::validationError($errors);
            }
            
            $updatedJob = $this->jobService->update($id, $data);
            
            return Response::success($updatedJob, 'Job updated successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * Delete job
     * DELETE /api/jobs/{id}
     */
    public function delete($id) {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $userRole = $_REQUEST['user_role'] ?? null;
            
            // Check ownership
            $job = $this->jobService->getById($id);
            if (!$job) {
                throw new NotFoundException('Job not found');
            }
            
            if ($job['user_id'] != $userId && $userRole !== 'admin') {
                throw new AuthorizationException('You do not have permission to delete this job');
            }
            
            $this->jobService->delete($id);
            
            return Response::success(null, 'Job deleted successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * Search jobs
     * GET /api/jobs/search
     */
    public function search() {
        try {
            $query = $_GET['q'] ?? '';
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            
            $result = $this->jobService->search($query, $page, $perPage);
            
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Filter jobs
     * GET /api/jobs/filter
     */
    public function filter() {
        try {
            $filters = $_GET;
            $page = $filters['page'] ?? 1;
            $perPage = $filters['per_page'] ?? 20;
            
            $result = $this->jobService->filter($filters, $page, $perPage);
            
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Get featured jobs
     * GET /api/jobs/featured
     */
    public function featured() {
        try {
            $limit = $_GET['limit'] ?? 10;
            $jobs = $this->jobService->getFeatured($limit);
            
            return Response::success($jobs);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Get recent jobs
     * GET /api/jobs/recent
     */
    public function recent() {
        try {
            $limit = $_GET['limit'] ?? 10;
            $jobs = $this->jobService->getRecent($limit);
            
            return Response::success($jobs);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Get jobs by company
     * GET /api/jobs/by-company/{companyId}
     */
    public function byCompany($companyId) {
        try {
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            
            $result = $this->jobService->getByCompany($companyId, $page, $perPage);
            
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Get my jobs
     * GET /api/jobs/my-jobs
     */
    public function myJobs() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            
            $result = $this->jobService->getByUser($userId, $page, $perPage);
            
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Toggle job status
     * PATCH /api/jobs/{id}/toggle-status
     */
    public function toggleStatus($id) {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $data = json_decode(file_get_contents('php://input'), true);
            $status = $data['status'] ?? null;
            
            // Check ownership
            $job = $this->jobService->getById($id);
            if ($job['user_id'] != $userId) {
                throw new AuthorizationException('You do not have permission to modify this job');
            }
            
            $this->jobService->toggleStatus($id, $status);
            
            return Response::success(null, 'Job status updated');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * Get job applications
     * GET /api/jobs/{id}/applications
     */
    public function jobApplications($id) {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            
            // Check ownership
            $job = $this->jobService->getById($id);
            if ($job['user_id'] != $userId) {
                throw new AuthorizationException('You do not have permission to view applications');
            }
            
            $applications = $this->jobService->getApplications($id);
            
            return Response::success($applications);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 403);
        }
    }
    
    /**
     * Get job analytics
     * GET /api/jobs/{id}/analytics
     */
    public function analytics($id) {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            
            // Check ownership
            $job = $this->jobService->getById($id);
            if ($job['user_id'] != $userId) {
                throw new AuthorizationException('You do not have permission to view analytics');
            }
            
            $analytics = $this->jobService->getAnalytics($id);
            
            return Response::success($analytics);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 403);
        }
    }
    
    /**
     * Get job categories
     * GET /api/jobs/categories
     */
    public function categories() {
        try {
            $categories = $this->jobService->getCategories();
            return Response::success($categories);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Get job locations
     * GET /api/jobs/locations
     */
    public function locations() {
        try {
            $locations = $this->jobService->getLocations();
            return Response::success($locations);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Mark job as featured
     * POST /api/jobs/{id}/feature
     */
    public function markAsFeatured($id) {
        try {
            $this->jobService->markAsFeatured($id);
            return Response::success(null, 'Job marked as featured');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * Bulk upload jobs
     * POST /api/jobs/bulk-upload
     */
    public function bulkUpload() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            
            if (!isset($_FILES['file'])) {
                throw new ValidationException('No file uploaded');
            }
            
            $result = $this->jobService->bulkUpload($userId, $_FILES['file']);
            
            return Response::success($result, 'Jobs uploaded successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
