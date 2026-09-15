<?php
/**
 * Rate Limiting Middleware
 * Prevents API abuse by limiting request frequency
 */

class RateLimitMiddleware {
    private $maxRequests;
    private $window;
    
    public function __construct($maxRequests = 100, $window = 60) {
        $this->maxRequests = $maxRequests;
        $this->window = $window;
    }
    
    public function handle() {
        $config = require CONFIG_PATH . '/app.php';
        
        if (!$config['api']['rate_limit']['enabled']) {
            return true;
        }
        
        $this->maxRequests = $config['api']['rate_limit']['max_requests'];
        $this->window = $config['api']['rate_limit']['window'];
        
        // Get client identifier (IP or user ID)
        $identifier = $this->getClientIdentifier();
        
        // Check rate limit
        if ($this->isRateLimited($identifier)) {
            $this->sendRateLimitResponse();
        }
        
        // Record request
        $this->recordRequest($identifier);
        
        return true;
    }
    
    /**
     * Get client identifier for rate limiting
     */
    private function getClientIdentifier() {
        $userId = $_REQUEST['user_id'] ?? null;
        
        if ($userId) {
            return 'user_' . $userId;
        }
        
        // Use IP address for unauthenticated requests
        return 'ip_' . $this->getClientIp();
    }
    
    /**
     * Get client IP address
     */
    private function getClientIp() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            return $_SERVER['REMOTE_ADDR'];
        }
    }
    
    /**
     * Check if client has exceeded rate limit
     */
    private function isRateLimited($identifier) {
        $cacheFile = STORAGE_PATH . '/cache/rate_limit_' . md5($identifier) . '.json';
        
        if (!file_exists($cacheFile)) {
            return false;
        }
        
        $data = json_decode(file_get_contents($cacheFile), true);
        
        // Clean old requests
        $data['requests'] = array_filter($data['requests'], function($timestamp) {
            return $timestamp > (time() - $this->window);
        });
        
        return count($data['requests']) >= $this->maxRequests;
    }
    
    /**
     * Record request for rate limiting
     */
    private function recordRequest($identifier) {
        $cacheDir = STORAGE_PATH . '/cache';
        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }
        
        $cacheFile = $cacheDir . '/rate_limit_' . md5($identifier) . '.json';
        
        $data = ['requests' => []];
        if (file_exists($cacheFile)) {
            $data = json_decode(file_get_contents($cacheFile), true);
        }
        
        // Add current request
        $data['requests'][] = time();
        
        // Clean old requests
        $data['requests'] = array_filter($data['requests'], function($timestamp) {
            return $timestamp > (time() - $this->window);
        });
        
        file_put_contents($cacheFile, json_encode($data));
    }
    
    /**
     * Send rate limit exceeded response
     */
    private function sendRateLimitResponse() {
        http_response_code(429);
        header('Retry-After: ' . $this->window);
        echo json_encode([
            'status' => 'error',
            'message' => 'Too many requests. Please try again later.',
            'retry_after' => $this->window
        ]);
        exit;
    }
}
