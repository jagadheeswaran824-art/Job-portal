<?php
/**
 * Application Configuration
 */

return [
    // Application Settings
    'name' => $_ENV['APP_NAME'] ?? 'Job Portal API',
    'version' => '1.0.0',
    'environment' => $_ENV['APP_ENV'] ?? 'development',
    'debug' => filter_var($_ENV['APP_DEBUG'] ?? true, FILTER_VALIDATE_BOOLEAN),
    'timezone' => $_ENV['APP_TIMEZONE'] ?? 'UTC',
    'url' => $_ENV['APP_URL'] ?? 'http://localhost',
    
    // API Settings
    'api' => [
        'prefix' => '/api',
        'version' => 'v1',
        'rate_limit' => [
            'enabled' => true,
            'max_requests' => 100,
            'window' => 60, // seconds
        ],
    ],
    
    // Security
    'security' => [
        'jwt_secret' => $_ENV['JWT_SECRET'] ?? 'your-secret-key-change-in-production',
        'jwt_expiry' => 3600, // 1 hour
        'refresh_token_expiry' => 604800, // 7 days
        'password_min_length' => 8,
        'password_require_special' => true,
        'max_login_attempts' => 5,
        'lockout_duration' => 900, // 15 minutes
    ],
    
    // File Upload
    'uploads' => [
        'max_file_size' => 5 * 1024 * 1024, // 5MB
        'allowed_resume_types' => ['pdf', 'doc', 'docx'],
        'allowed_image_types' => ['jpg', 'jpeg', 'png', 'gif'],
        'resume_path' => STORAGE_PATH . '/resumes',
        'profile_image_path' => STORAGE_PATH . '/profile-images',
        'job_image_path' => STORAGE_PATH . '/job-images',
    ],
    
    // Pagination
    'pagination' => [
        'default_per_page' => 20,
        'max_per_page' => 100,
    ],
    
    // Logging
    'logging' => [
        'enabled' => true,
        'level' => $_ENV['LOG_LEVEL'] ?? 'info', // debug, info, warning, error
        'path' => LOGS_PATH,
    ],
    
    // Email (for future implementation)
    'mail' => [
        'from' => $_ENV['MAIL_FROM'] ?? 'noreply@jobportal.com',
        'from_name' => $_ENV['MAIL_FROM_NAME'] ?? 'Job Portal',
    ],
];
