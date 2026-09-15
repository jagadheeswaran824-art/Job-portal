<?php
/**
 * Development Environment Configuration
 */

return [
    'app' => [
        'debug' => true,
        'environment' => 'development',
    ],
    
    'database' => [
        'log_queries' => true,
        'slow_query_log' => true,
        'slow_query_threshold' => 1000, // milliseconds
    ],
    
    'logging' => [
        'level' => 'debug',
        'log_queries' => true,
        'log_requests' => true,
        'log_responses' => true,
    ],
    
    'cache' => [
        'enabled' => false,
    ],
    
    'security' => [
        'strict_mode' => false,
    ],
    
    'cors' => [
        'allowed_origins' => ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5500'],
    ],
];
