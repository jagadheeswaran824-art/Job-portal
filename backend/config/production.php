<?php
/**
 * Production Environment Configuration
 */

return [
    'app' => [
        'debug' => false,
        'environment' => 'production',
    ],
    
    'database' => [
        'log_queries' => false,
        'slow_query_log' => true,
        'slow_query_threshold' => 2000, // milliseconds
    ],
    
    'logging' => [
        'level' => 'error',
        'log_queries' => false,
        'log_requests' => false,
        'log_responses' => false,
    ],
    
    'cache' => [
        'enabled' => true,
        'driver' => 'redis',
        'ttl' => 3600,
    ],
    
    'security' => [
        'strict_mode' => true,
        'force_https' => true,
        'hsts_enabled' => true,
    ],
    
    'cors' => [
        'allowed_origins' => explode(',', $_ENV['CORS_ALLOWED_ORIGINS'] ?? ''),
    ],
    
    'rate_limit' => [
        'enabled' => true,
        'max_requests' => 60,
        'window' => 60,
    ],
];
