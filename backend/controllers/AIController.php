<?php
/**
 * AI Controller
 * Handles AI-powered features and recommendations
 */

require_once BASE_PATH . '/services/AIService.php';
require_once BASE_PATH . '/utils/Response.php';

class AIController {
    private $aiService;
    
    public function __construct() {
        $this->aiService = new AIService();
    }
    
    public function jobRecommendations() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $limit = $_GET['limit'] ?? 10;
            $recommendations = $this->aiService->getJobRecommendations($userId, $limit);
            return Response::success($recommendations);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function analyzeResume() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            if (!isset($_FILES['resume'])) {
                throw new ValidationException('Resume file required');
            }
            $analysis = $this->aiService->analyzeResume($_FILES['resume']);
            return Response::success($analysis);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function calculateMatchScore() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $userId = $data['user_id'] ?? $_REQUEST['user_id'];
            $jobId = $data['job_id'] ?? null;
            
            if (!$jobId) {
                throw new ValidationException('Job ID required');
            }
            
            $score = $this->aiService->calculateMatchScore($userId, $jobId);
            return Response::success($score);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function skillSuggestions() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $suggestions = $this->aiService->getSkillSuggestions($userId);
            return Response::success($suggestions);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function generateCoverLetter() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $userId = $_REQUEST['user_id'] ?? null;
            $jobId = $data['job_id'] ?? null;
            
            $coverLetter = $this->aiService->generateCoverLetter($userId, $jobId);
            return Response::success($coverLetter);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function interviewTips() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $jobId = $data['job_id'] ?? null;
            $tips = $this->aiService->getInterviewTips($jobId);
            return Response::success($tips);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function salaryInsights() {
        try {
            $jobTitle = $_GET['job_title'] ?? null;
            $location = $_GET['location'] ?? null;
            $experience = $_GET['experience'] ?? null;
            
            $insights = $this->aiService->getSalaryInsights($jobTitle, $location, $experience);
            return Response::success($insights);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function careerPathSuggestions() {
        try {
            $userId = $_REQUEST['user_id'] ?? null;
            $suggestions = $this->aiService->getCareerPathSuggestions($userId);
            return Response::success($suggestions);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    public function screenCandidates() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $jobId = $data['job_id'] ?? null;
            $criteria = $data['criteria'] ?? [];
            
            $results = $this->aiService->screenCandidates($jobId, $criteria);
            return Response::success($results);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function optimizeJobDescription() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $description = $data['description'] ?? null;
            
            if (!$description) {
                throw new ValidationException('Job description required');
            }
            
            $optimized = $this->aiService->optimizeJobDescription($description);
            return Response::success($optimized);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    public function candidateInsights($applicationId) {
        try {
            $insights = $this->aiService->getCandidateInsights($applicationId);
            return Response::success($insights);
        } catch (Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 404);
        }
    }
}
