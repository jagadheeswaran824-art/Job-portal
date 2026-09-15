<?php
/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 */

return [
    // Allowed Origins
    'allowed_origins' => explode(',', $_ENV['CORS_ALLOWED_ORIGINS'] ?? '*'),
    
    // Allowed Methods
    'allowed_methods' => [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
    ],
    
    // Allowed Headers
    'allowed_headers' => [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-CSRF-Token',
    ],
    
    // Exposed Headers
    'exposed_headers' => [
        'X-Total-Count',
        'X-Page-Count',
        'X-Per-Page',
        'X-Current-Page',
    ],
    
    // Credentials Support
    'supports_credentials' => true,
    
    // Max Age (in seconds)
    'max_age' => 3600,
    
    // Paths that require CORS
    'paths' => [
        'api/*',
    ],
];
