<?php
/**
 * Authentication Controller
 * Handles user registration, login, logout, and password management
 */

require_once BASE_PATH . '/services/AuthService.php';
require_once BASE_PATH . '/validators/AuthValidator.php';
require_once BASE_PATH . '/utils/Response.php';

class AuthController {
    private $authService;
    private $validator;
    
    public function __construct() {
        $this->authService = new AuthService();
        $this->validator = new AuthValidator();
    }
    
    /**
     * Register a new user
     * POST /api/auth/register
     */
    public function register() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate input
            $errors = $this->validator->validateRegistration($data);
            if (!empty($errors)) {
                return Response::validationError($errors);
            }
            
            // Register user
            $result = $this->authService->register($data);
            
            return Response::success($result, 'Registration successful', 201);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Login user
     * POST /api/auth/login
     */
    public function login() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate input
            $errors = $this->validator->validateLogin($data);
            if (!empty($errors)) {
                return Response::validationError($errors);
            }
            
            // Login user
            $result = $this->authService->login($data['email'], $data['password']);
            
            return Response::success($result, 'Login successful');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 401);
        }
    }
    
    /**
     * Logout user
     * POST /api/auth/logout
     */
    public function logout() {
        try {
            $token = $this->getTokenFromHeader();
            $this->authService->logout($token);
            
            return Response::success(null, 'Logout successful');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * Get current authenticated user
     * GET /api/auth/me
     */
    public function me() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            
            if (!$userId) {
                throw new AuthenticationException('User not authenticated');
            }
            
            $user = $this->authService->getUserById($userId);
            
            return Response::success($user);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 401);
        }
    }
    
    /**
     * Refresh access token
     * POST /api/auth/refresh
     */
    public function refreshToken() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $refreshToken = $data['refresh_token'] ?? null;
            
            if (!$refreshToken) {
                throw new ValidationException('Refresh token is required');
            }
            
            $result = $this->authService->refreshToken($refreshToken);
            
            return Response::success($result);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 401);
        }
    }
    
    /**
     * Change password
     * POST /api/auth/change-password
     */
    public function changePassword() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate input
            $errors = $this->validator->validatePasswordChange($data);
            if (!empty($errors)) {
                return Response::validationError($errors);
            }
            
            $this->authService->changePassword(
                $userId,
                $data['current_password'],
                $data['new_password']
            );
            
            return Response::success(null, 'Password changed successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * Forgot password
     * POST /api/auth/forgot-password
     */
    public function forgotPassword() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $email = $data['email'] ?? null;
            
            if (!$email) {
                throw new ValidationException('Email is required');
            }
            
            $this->authService->forgotPassword($email);
            
            return Response::success(null, 'Password reset instructions sent to your email');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * Reset password
     * POST /api/auth/reset-password
     */
    public function resetPassword() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $errors = $this->validator->validatePasswordReset($data);
            if (!empty($errors)) {
                return Response::validationError($errors);
            }
            
            $this->authService->resetPassword(
                $data['token'],
                $data['password']
            );
            
            return Response::success(null, 'Password reset successful');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * Verify email
     * POST /api/auth/verify-email
     */
    public function verifyEmail() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $token = $data['token'] ?? null;
            
            if (!$token) {
                throw new ValidationException('Verification token is required');
            }
            
            $this->authService->verifyEmail($token);
            
            return Response::success(null, 'Email verified successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * Get token from Authorization header
     */
    private function getTokenFromHeader() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        
        return null;
    }
}
