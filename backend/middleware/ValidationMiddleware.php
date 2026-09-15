<?php
/**
 * Validation Middleware
 * Validates incoming request data
 */

require_once BASE_PATH . '/utils/Validator.php';

class ValidationMiddleware {
    private $rules;
    
    public function __construct($rules = []) {
        $this->rules = $rules;
    }
    
    public function handle() {
        $data = $this->getRequestData();
        
        $validator = new Validator();
        $errors = $validator->validate($data, $this->rules);
        
        if (!empty($errors)) {
            http_response_code(422);
            echo json_encode([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $errors
            ]);
            exit;
        }
        
        return true;
    }
    
    /**
     * Get request data based on method
     */
    private function getRequestData() {
        $method = $_SERVER['REQUEST_METHOD'];
        
        if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (strpos($contentType, 'application/json') !== false) {
                return json_decode(file_get_contents('php://input'), true) ?? [];
            }
            
            return $_POST;
        }
        
        return $_GET;
    }
}
