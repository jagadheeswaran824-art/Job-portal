<?php
/**
 * AI & Recommendation Routes
 */

// All routes require authentication
Router::middleware('AuthMiddleware')::get('/api/ai/job-recommendations', 'AIController@jobRecommendations');
Router::middleware('AuthMiddleware')::post('/api/ai/resume-analysis', 'AIController@analyzeResume');
Router::middleware('AuthMiddleware')::post('/api/ai/job-match-score', 'AIController@calculateMatchScore');
Router::middleware('AuthMiddleware')::get('/api/ai/skill-suggestions', 'AIController@skillSuggestions');
Router::middleware('AuthMiddleware')::post('/api/ai/cover-letter-generator', 'AIController@generateCoverLetter');
Router::middleware('AuthMiddleware')::post('/api/ai/interview-tips', 'AIController@interviewTips');
Router::middleware('AuthMiddleware')::get('/api/ai/salary-insights', 'AIController@salaryInsights');
Router::middleware('AuthMiddleware')::get('/api/ai/career-path', 'AIController@careerPathSuggestions');

// Employer AI features
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::post('/api/ai/candidate-screening', 'AIController@screenCandidates');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::post('/api/ai/job-description-optimizer', 'AIController@optimizeJobDescription');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::get('/api/ai/candidate-insights/{applicationId}', 'AIController@candidateInsights');
