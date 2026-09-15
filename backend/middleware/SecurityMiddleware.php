<?php
/**
 * Security Middleware
 * Implements various security measures
 */

require_once BASE_PATH . '/utils/Sanitizer.php';

class SecurityMiddleware {
    public function handle() {
        // Add security headers
        $this->addSecurityHeaders();
        
        // Sanitize input
        $this->sanitizeInput();
        
        // Check for SQL injection patterns
        $this->checkSqlInjection();
        
        // Check for XSS attempts
        $this->checkXss();
        
        return true;
    }
    
    /**
     * Add security headers
     */
    private function addSecurityHeaders() {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Content-Security-Policy: default-src \'self\'');
        
        // HSTS for production
        $config = require CONFIG_PATH . '/app.php';
        if ($config['environment'] === 'production') {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
    }
    
    /**
     * Sanitize input data
     */
    private function sanitizeInput() {
        $_GET = Sanitizer::sanitizeArray($_GET);
        $_POST = Sanitizer::sanitizeArray($_POST);
        $_COOKIE = Sanitizer::sanitizeArray($_COOKIE);
    }
    
    /**
     * Check for SQL injection attempts
     */
    private function checkSqlInjection() {
        $patterns = [
            '/(\bUNION\b.*\bSELECT\b)/i',
            '/(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i',
            '/(\bINSERT\b.*\bINTO\b.*\bVALUES\b)/i',
            '/(\bDELETE\b.*\bFROM\b)/i',
            '/(\bDROP\b.*\bTABLE\b)/i',
            '/(\bUPDATE\b.*\bSET\b)/i',
            '/(--|#|\/\*|\*\/)/i'
        ];
        
        $allInput = array_merge($_GET, $_POST);
        
        foreach ($allInput as $value) {
            if (is_string($value)) {
                foreach ($patterns as $pattern) {
                    if (preg_match($pattern, $value)) {
                        $this->blockRequest('Potential SQL injection detected');
                    }
                }
            }
        }
    }
    
    /**
     * Check for XSS attempts
     */
    private function checkXss() {
        $patterns = [
            '/<script[^>]*>.*?<\/script>/is',
            '/javascript:/i',
            '/on\w+\s*=/i'
        ];
        
        $allInput = array_merge($_GET, $_POST);
        
        foreach ($allInput as $value) {
            if (is_string($value)) {
                foreach ($patterns as $pattern) {
                    if (preg_match($pattern, $value)) {
                        $this->blockRequest('Potential XSS attack detected');
                    }
                }
            }
        }
    }
    
    /**
     * Block suspicious requests
     */
    private function blockRequest($reason) {
        error_log("Security: $reason - IP: " . $_SERVER['REMOTE_ADDR']);
        
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'Request blocked for security reasons'
        ]);
        exit;
    }
}
