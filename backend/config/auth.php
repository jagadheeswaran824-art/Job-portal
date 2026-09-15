<?php
/**
 * Authentication Configuration
 */

return [
    // JWT Settings
    'jwt' => [
        'secret' => $_ENV['JWT_SECRET'] ?? 'your-secret-key-change-in-production',
        'algorithm' => 'HS256',
        'expiry' => 3600, // 1 hour in seconds
        'refresh_expiry' => 604800, // 7 days in seconds
        'issuer' => $_ENV['APP_URL'] ?? 'http://localhost',
        'audience' => $_ENV['APP_URL'] ?? 'http://localhost',
    ],
    
    // Session Settings
    'session' => [
        'driver' => 'database', // database, file, redis
        'lifetime' => 120, // minutes
        'expire_on_close' => false,
    ],
    
    // Password Settings
    'password' => [
        'min_length' => 8,
        'require_uppercase' => true,
        'require_lowercase' => true,
        'require_numbers' => true,
        'require_special_chars' => true,
        'hash_algorithm' => PASSWORD_BCRYPT,
        'hash_cost' => 12,
    ],
    
    // User Roles
    'roles' => [
        'admin' => 1,
        'employer' => 2,
        'job_seeker' => 3,
    ],
    
    // Permissions
    'permissions' => [
        'admin' => [
            'manage_users',
            'manage_jobs',
            'manage_applications',
            'view_analytics',
            'manage_settings',
        ],
        'employer' => [
            'post_jobs',
            'edit_own_jobs',
            'delete_own_jobs',
            'view_applications',
            'manage_company_profile',
        ],
        'job_seeker' => [
            'apply_jobs',
            'save_jobs',
            'manage_profile',
            'upload_resume',
            'view_applications',
        ],
    ],
    
    // Login Throttling
    'throttle' => [
        'enabled' => true,
        'max_attempts' => 5,
        'decay_minutes' => 15,
    ],
    
    // Token Blacklist (for logout)
    'blacklist' => [
        'enabled' => true,
        'grace_period' => 30, // seconds
    ],
    
    // Two-Factor Authentication (for future implementation)
    '2fa' => [
        'enabled' => false,
        'issuer' => 'Job Portal',
    ],
];
