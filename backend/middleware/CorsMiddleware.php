<?php
/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing
 */

class CorsMiddleware {
    public function handle() {
        $config = require CONFIG_PATH . '/cors.php';
        
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        // Check if origin is allowed
        $allowedOrigins = $config['allowed_origins'];
        
        if (in_array('*', $allowedOrigins)) {
            header('Access-Control-Allow-Origin: *');
        } elseif (in_array($origin, $allowedOrigins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }
        
        // Set other CORS headers
        header('Access-Control-Allow-Methods: ' . implode(', ', $config['allowed_methods']));
        header('Access-Control-Allow-Headers: ' . implode(', ', $config['allowed_headers']));
        header('Access-Control-Expose-Headers: ' . implode(', ', $config['exposed_headers']));
        
        if ($config['supports_credentials']) {
            header('Access-Control-Allow-Credentials: true');
        }
        
        header('Access-Control-Max-Age: ' . $config['max_age']);
        
        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
        
        return true;
    }
}
