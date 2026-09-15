<?php
/**
 * Profile Routes
 */

// Public routes
Router::get('/api/profiles/{userId}', 'ProfileController@show');

// Protected routes (authentication required)
Router::middleware('AuthMiddleware')::get('/api/profiles/me', 'ProfileController@me');
Router::middleware('AuthMiddleware')::put('/api/profiles/me', 'ProfileController@update');
Router::middleware('AuthMiddleware')::post('/api/profiles/skills', 'ProfileController@addSkill');
Router::middleware('AuthMiddleware')::delete('/api/profiles/skills/{skillId}', 'ProfileController@removeSkill');
Router::middleware('AuthMiddleware')::post('/api/profiles/experience', 'ProfileController@addExperience');
Router::middleware('AuthMiddleware')::put('/api/profiles/experience/{experienceId}', 'ProfileController@updateExperience');
Router::middleware('AuthMiddleware')::delete('/api/profiles/experience/{experienceId}', 'ProfileController@removeExperience');
Router::middleware('AuthMiddleware')::post('/api/profiles/education', 'ProfileController@addEducation');
Router::middleware('AuthMiddleware')::put('/api/profiles/education/{educationId}', 'ProfileController@updateEducation');
Router::middleware('AuthMiddleware')::delete('/api/profiles/education/{educationId}', 'ProfileController@removeEducation');
Router::middleware('AuthMiddleware')::post('/api/profiles/resume', 'ProfileController@uploadResume');
Router::middleware('AuthMiddleware')::delete('/api/profiles/resume', 'ProfileController@deleteResume');
Router::middleware('AuthMiddleware')::get('/api/profiles/resume/download', 'ProfileController@downloadResume');
Router::middleware('AuthMiddleware')::get('/api/profiles/completion', 'ProfileController@completionStatus');
