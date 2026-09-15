<?php
/**
 * Job Portal - Application Entry Point
 * 
 * This file serves as the front controller for all API requests.
 * It initializes the application, loads configurations, and routes requests.
 */

// Enable error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set default timezone
date_default_timezone_set('UTC');

// Define application paths
define('BASE_PATH', dirname(__DIR__));
define('APP_PATH', BASE_PATH);
define('CONFIG_PATH', BASE_PATH . '/config');
define('STORAGE_PATH', BASE_PATH . '/storage');
define('LOGS_PATH', BASE_PATH . '/logs');

// Autoloader
require_once BASE_PATH . '/vendor/autoload.php';

// Load environment variables
require_once CONFIG_PATH . '/environment.php';

// Load configuration
$config = require_once CONFIG_PATH . '/app.php';

// CORS headers
header('Access-Control-Allow-Origin: ' . ($_ENV['CORS_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=UTF-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Error and exception handlers
require_once BASE_PATH . '/handlers/ErrorHandler.php';
require_once BASE_PATH . '/handlers/ExceptionHandler.php';

$errorHandler = new ErrorHandler();
$exceptionHandler = new ExceptionHandler();

set_error_handler([$errorHandler, 'handle']);
set_exception_handler([$exceptionHandler, 'handle']);

// Get request URI and method
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Remove query string from URI
$requestUri = strtok($requestUri, '?');

// Remove base path if application is in subdirectory
$scriptName = dirname($_SERVER['SCRIPT_NAME']);
if ($scriptName !== '/') {
    $requestUri = str_replace($scriptName, '', $requestUri);
}

// Router
require_once BASE_PATH . '/routes/api.php';

// If no route matched, return 404
http_response_code(404);
echo json_encode([
    'status' => 'error',
    'message' => 'Endpoint not found',
    'path' => $requestUri
]);
