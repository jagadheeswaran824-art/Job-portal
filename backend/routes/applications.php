<?php
/**
 * Application Routes
 */

// All routes require authentication
Router::middleware('AuthMiddleware')::get('/api/applications', 'ApplicationController@index');
Router::middleware('AuthMiddleware')::get('/api/applications/{id}', 'ApplicationController@show');
Router::middleware('AuthMiddleware')::post('/api/applications', 'ApplicationController@create');
Router::middleware('AuthMiddleware')::put('/api/applications/{id}', 'ApplicationController@update');
Router::middleware('AuthMiddleware')::delete('/api/applications/{id}', 'ApplicationController@delete');
Router::middleware('AuthMiddleware')::patch('/api/applications/{id}/status', 'ApplicationController@updateStatus');
Router::middleware('AuthMiddleware')::get('/api/applications/my-applications', 'ApplicationController@myApplications');
Router::middleware('AuthMiddleware')::get('/api/applications/job/{jobId}', 'ApplicationController@byJob');
Router::middleware('AuthMiddleware')::post('/api/applications/{id}/withdraw', 'ApplicationController@withdraw');
Router::middleware('AuthMiddleware')::get('/api/applications/{id}/timeline', 'ApplicationController@timeline');

// Employer routes
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::post('/api/applications/{id}/shortlist', 'ApplicationController@shortlist');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::post('/api/applications/{id}/reject', 'ApplicationController@reject');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::post('/api/applications/{id}/schedule-interview', 'ApplicationController@scheduleInterview');
