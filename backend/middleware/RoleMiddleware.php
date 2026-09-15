<?php
/**
 * Role-Based Access Control Middleware
 * Checks user permissions based on their role
 */

require_once BASE_PATH . '/exceptions/AuthorizationException.php';

class RoleMiddleware {
    private $allowedRoles = [];
    
    public function __construct($allowedRoles = ['admin']) {
        $this->allowedRoles = is_array($allowedRoles) ? $allowedRoles : [$allowedRoles];
    }
    
    public function handle() {
        try {
            $userRole = $_REQUEST['user_role'] ?? null;
            
            if (!$userRole) {
                throw new AuthorizationException('User role not found');
            }
            
            // If no specific roles defined, default to admin only
            if (empty($this->allowedRoles)) {
                $this->allowedRoles = ['admin'];
            }
            
            // Check if user's role is in allowed roles
            if (!in_array($userRole, $this->allowedRoles)) {
                throw new AuthorizationException('You do not have permission to access this resource');
            }
            
            return true;
        } catch (AuthorizationException $e) {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Authorization check failed'
            ]);
            exit;
        }
    }
    
    /**
     * Check if user has specific permission
     */
    public static function hasPermission($permission) {
        $userRole = $_REQUEST['user_role'] ?? null;
        
        if (!$userRole) {
            return false;
        }
        
        $config = require CONFIG_PATH . '/auth.php';
        $permissions = $config['permissions'][$userRole] ?? [];
        
        return in_array($permission, $permissions);
    }
}
