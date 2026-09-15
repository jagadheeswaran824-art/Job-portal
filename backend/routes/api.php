<?php
/**
 * Main API Router
 * 
 * This file handles routing for all API endpoints
 */

// Simple Router Implementation
class Router {
    private static $routes = [];
    private static $middlewares = [];
    
    public static function get($path, $handler) {
        self::addRoute('GET', $path, $handler);
    }
    
    public static function post($path, $handler) {
        self::addRoute('POST', $path, $handler);
    }
    
    public static function put($path, $handler) {
        self::addRoute('PUT', $path, $handler);
    }
    
    public static function patch($path, $handler) {
        self::addRoute('PATCH', $path, $handler);
    }
    
    public static function delete($path, $handler) {
        self::addRoute('DELETE', $path, $handler);
    }
    
    private static function addRoute($method, $path, $handler) {
        self::$routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
            'middlewares' => self::$middlewares
        ];
        self::$middlewares = [];
    }
    
    public static function middleware($middleware) {
        self::$middlewares[] = $middleware;
        return new self();
    }
    
    public static function dispatch($requestUri, $requestMethod) {
        foreach (self::$routes as $route) {
            $pattern = self::convertPathToRegex($route['path']);
            
            if ($route['method'] === $requestMethod && preg_match($pattern, $requestUri, $matches)) {
                array_shift($matches); // Remove full match
                
                // Execute middlewares
                foreach ($route['middlewares'] as $middleware) {
                    $middlewareInstance = new $middleware();
                    $result = $middlewareInstance->handle();
                    if ($result !== true) {
                        return;
                    }
                }
                
                // Execute handler
                list($controller, $method) = explode('@', $route['handler']);
                require_once BASE_PATH . '/controllers/' . $controller . '.php';
                
                $controllerInstance = new $controller();
                call_user_func_array([$controllerInstance, $method], $matches);
                return;
            }
        }
    }
    
    private static function convertPathToRegex($path) {
        $path = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '([a-zA-Z0-9_-]+)', $path);
        return '#^' . $path . '$#';
    }
}

// Load all route files
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/user.php';
require_once __DIR__ . '/jobs.php';
require_once __DIR__ . '/applications.php';
require_once __DIR__ . '/profiles.php';
require_once __DIR__ . '/saved-jobs.php';
require_once __DIR__ . '/notifications.php';
require_once __DIR__ . '/dashboard.php';
require_once __DIR__ . '/admin.php';
require_once __DIR__ . '/ai.php';

// Dispatch the request
Router::dispatch($requestUri, $requestMethod);
