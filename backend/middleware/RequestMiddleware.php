<?php
/**
 * Request Middleware
 * Handles request logging and processing
 */

require_once BASE_PATH . '/utils/Logger.php';

class RequestMiddleware {
    public function handle() {
        // Log request
        $this->logRequest();
        
        // Set request ID for tracking
        $this->setRequestId();
        
        // Parse JSON body for PUT/PATCH/DELETE
        $this->parseJsonBody();
        
        return true;
    }
    
    /**
     * Log incoming request
     */
    private function logRequest() {
        $config = require CONFIG_PATH . '/app.php';
        
        if (!$config['logging']['enabled']) {
            return;
        }
        
        $logger = new Logger();
        $logger->info('Request', [
            'method' => $_SERVER['REQUEST_METHOD'],
            'uri' => $_SERVER['REQUEST_URI'],
            'ip' => $_SERVER['REMOTE_ADDR'],
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * Set unique request ID
     */
    private function setRequestId() {
        $requestId = uniqid('req_', true);
        $_SERVER['REQUEST_ID'] = $requestId;
        header('X-Request-ID: ' . $requestId);
    }
    
    /**
     * Parse JSON body for non-POST requests
     */
    private function parseJsonBody() {
        $method = $_SERVER['REQUEST_METHOD'];
        
        if (in_array($method, ['PUT', 'PATCH', 'DELETE'])) {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (strpos($contentType, 'application/json') !== false) {
                $input = file_get_contents('php://input');
                $_REQUEST = array_merge($_REQUEST, json_decode($input, true) ?? []);
            }
        }
    }
}
