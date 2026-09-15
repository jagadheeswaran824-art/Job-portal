<?php
/**
 * Environment Variables Loader
 * Loads .env file and sets environment variables
 */

class Environment {
    /**
     * Load environment variables from .env file
     */
    public static function load($path = null) {
        $envFile = $path ?? BASE_PATH . '/.env';
        
        if (!file_exists($envFile)) {
            error_log("Warning: .env file not found at $envFile");
            return;
        }
        
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }
            
            // Parse line
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                
                // Remove quotes
                $value = self::removeQuotes($value);
                
                // Set environment variable
                if (!array_key_exists($name, $_ENV)) {
                    $_ENV[$name] = $value;
                    putenv("$name=$value");
                }
            }
        }
    }
    
    /**
     * Remove surrounding quotes from value
     */
    private static function removeQuotes($value) {
        if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
            (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
            return substr($value, 1, -1);
        }
        return $value;
    }
    
    /**
     * Get environment variable
     */
    public static function get($key, $default = null) {
        return $_ENV[$key] ?? getenv($key) ?: $default;
    }
    
    /**
     * Check if environment variable exists
     */
    public static function has($key) {
        return isset($_ENV[$key]) || getenv($key) !== false;
    }
    
    /**
     * Set environment variable
     */
    public static function set($key, $value) {
        $_ENV[$key] = $value;
        putenv("$key=$value");
    }
}

// Load environment variables
Environment::load();
