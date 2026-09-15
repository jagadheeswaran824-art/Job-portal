<?php
/**
 * Profile Controller
 * Handles user profile operations
 */

require_once BASE_PATH . '/services/ProfileService.php';
require_once BASE_PATH . '/validators/ProfileValidator.php';
require_once BASE_PATH . '/utils/Response.php';

class ProfileController {
    private $profileService;
    private $validator;
    
    public function __construct() {
        $this->profileService = new ProfileService();
        $this->validator = new ProfileValidator();
    }
    
    public function show($userId) {
        try {
            $profile = $this->profileService->getByUserId($userId);
            return Response::success($profile);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 404);
        }
    }
    
    public function me() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $profile = $this->profileService->getByUserId($userId);
            return Response::success($profile);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 404);
        }
    }
    
    public function update() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $data = json_decode(file_get_contents('php://input'), true);
            
            $errors = $this->validator->validateUpdate($data);
            if (!empty($errors)) {
                return Response::validationError($errors);
            }
            
            $profile = $this->profileService->update($userId, $data);
            return Response::success($profile, 'Profile updated successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function addSkill() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $data = json_decode(file_get_contents('php://input'), true);
            $this->profileService->addSkill($userId, $data);
            return Response::success(null, 'Skill added successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function removeSkill($skillId) {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $this->profileService->removeSkill($userId, $skillId);
            return Response::success(null, 'Skill removed successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function addExperience() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $data = json_decode(file_get_contents('php://input'), true);
            $this->profileService->addExperience($userId, $data);
            return Response::success(null, 'Experience added successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function updateExperience($experienceId) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $this->profileService->updateExperience($experienceId, $data);
            return Response::success(null, 'Experience updated successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function removeExperience($experienceId) {
        try {
            $this->profileService->removeExperience($experienceId);
            return Response::success(null, 'Experience removed successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function addEducation() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $data = json_decode(file_get_contents('php://input'), true);
            $this->profileService->addEducation($userId, $data);
            return Response::success(null, 'Education added successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function updateEducation($educationId) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $this->profileService->updateEducation($educationId, $data);
            return Response::success(null, 'Education updated successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function removeEducation($educationId) {
        try {
            $this->profileService->removeEducation($educationId);
            return Response::success(null, 'Education removed successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function uploadResume() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            if (!isset($_FILES['resume'])) {
                throw new ValidationException('No file uploaded');
            }
            $result = $this->profileService->uploadResume($userId, $_FILES['resume']);
            return Response::success($result, 'Resume uploaded successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function deleteResume() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $this->profileService->deleteResume($userId);
            return Response::success(null, 'Resume deleted successfully');
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function downloadResume() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $this->profileService->downloadResume($userId);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 404);
        }
    }
    
    public function completionStatus() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $status = $this->profileService->getCompletionStatus($userId);
            return Response::success($status);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
}
