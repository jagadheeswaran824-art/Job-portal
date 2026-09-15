<?php
/**
 * User Controller
 * Handles user management operations
 */

require_once BASE_PATH . '/services/UserService.php';
require_once BASE_PATH . '/validators/UserValidator.php';
require_once BASE_PATH . '/utils/Response.php';

class UserController {
    private $userService;
    private $validator;
    
    public function __construct() {
        $this->userService = new UserService();
        $this->validator = new UserValidator();
    }
    
    /**
     * Get all users (paginated)
     * GET /api/users
     */
    public function index() {
        try {
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            $search = $_GET['search'] ?? null;
            $role = $_GET['role'] ?? null;
            
            $result = $this->userService->getAll($page, $perPage, $search, $role);
            
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Get user by ID
     * GET /api/users/{id}
     */
    public function show($id) {
        try {
            $user = $this->userService->getById($id);
            
            if (!$user) {
                throw new NotFoundException('User not found');
            }
            
            return Response::success($user);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 404);
        }
    }
    
    /**
     * Update user
     * PUT /api/users/{id}
     */
    public function update($id) {
        try {
            $currentUserId = $_REQUEST['user_id'] ?? null;
            $userRole = $_REQUEST['user_role'] ?? null;
            
            // Check permission
            if ($currentUserId != $id && $userRole !== 'admin') {
                throw new AuthorizationException('You do not have permission to update this user');
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate input
            $errors = $this->validator->validateUpdate($data);
            if (!empty($errors)) {
                return Response::validationError($errors);
            }
            
            $user = $this->userService->update($id, $data);
            
            return Response::success($user, 'User updated successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * Delete user
     * DELETE /api/users/{id}
     */
    public function delete($id) {
        try {
            $currentUserId = $_REQUEST['user_id'] ?? null;
            $userRole = $_REQUEST['user_role'] ?? null;
            
            // Check permission
            if ($currentUserId != $id && $userRole !== 'admin') {
                throw new AuthorizationException('You do not have permission to delete this user');
            }
            
            $this->userService->delete($id);
            
            return Response::success(null, 'User deleted successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * Upload user avatar
     * POST /api/users/{id}/upload-avatar
     */
    public function uploadAvatar($id) {
        try {
            $currentUserId = $_REQUEST['user_id'] ?? null;
            
            if ($currentUserId != $id) {
                throw new AuthorizationException('You can only upload your own avatar');
            }
            
            if (!isset($_FILES['avatar'])) {
                throw new ValidationException('No file uploaded');
            }
            
            $result = $this->userService->uploadAvatar($id, $_FILES['avatar']);
            
            return Response::success($result, 'Avatar uploaded successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * Get all users for admin
     * GET /api/users/admin/list
     */
    public function adminList() {
        try {
            $page = $_GET['page'] ?? 1;
            $perPage = $_GET['per_page'] ?? 20;
            $filters = $_GET;
            
            $result = $this->userService->adminList($page, $perPage, $filters);
            
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Toggle user status (active/inactive)
     * PUT /api/users/{id}/toggle-status
     */
    public function toggleStatus($id) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $status = $data['status'] ?? null;
            
            if (!in_array($status, ['active', 'inactive', 'banned'])) {
                throw new ValidationException('Invalid status value');
            }
            
            $this->userService->toggleStatus($id, $status);
            
            return Response::success(null, 'User status updated successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
