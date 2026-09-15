<?php
/**
 * Authentication Middleware
 * Verifies JWT tokens and authenticates users
 */

require_once BASE_PATH . '/utils/TokenHelper.php';
require_once BASE_PATH . '/exceptions/AuthenticationException.php';

class AuthMiddleware {
    public function handle() {
        try {
            $token = $this->getTokenFromHeader();
            
            if (!$token) {
                throw new AuthenticationException('No authentication token provided');
            }
            
            // Verify and decode token
            $payload = TokenHelper::verify($token);
            
            if (!$payload) {
                throw new AuthenticationException('Invalid or expired token');
            }
            
            // Check if token is blacklisted (for logout functionality)
            if ($this->isTokenBlacklisted($token)) {
                throw new AuthenticationException('Token has been revoked');
            }
            
            // Store user information in request
            $_REQUEST['user_id'] = $payload['user_id'];
            $_REQUEST['user_email'] = $payload['email'];
            $_REQUEST['user_role'] = $payload['role'];
            $_REQUEST['token'] = $token;
            
            return true;
        } catch (AuthenticationException $e) {
            http_response_code(401);
            echo json_encode([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Authentication failed'
            ]);
            exit;
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
    
    /**
     * Check if token is blacklisted
     */
    private function isTokenBlacklisted($token) {
        try {
            $db = Database::getInstance();
            $sql = "SELECT id FROM token_blacklist WHERE token = ? AND expires_at > NOW()";
            $result = $db->fetchOne($sql, [$token]);
            return $result !== false;
        } catch (Exception $e) {
            // If blacklist table doesn't exist, skip check
            return false;
        }
    }
}
