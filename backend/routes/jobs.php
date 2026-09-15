<?php
/**
 * Job Routes
 */

// Public routes (no authentication required)
Router::get('/api/jobs', 'JobController@index');
Router::get('/api/jobs/{id}', 'JobController@show');
Router::get('/api/jobs/search', 'JobController@search');
Router::get('/api/jobs/filter', 'JobController@filter');
Router::get('/api/jobs/featured', 'JobController@featured');
Router::get('/api/jobs/recent', 'JobController@recent');
Router::get('/api/jobs/by-company/{companyId}', 'JobController@byCompany');
Router::get('/api/jobs/categories', 'JobController@categories');
Router::get('/api/jobs/locations', 'JobController@locations');

// Protected routes (authentication required)
Router::middleware('AuthMiddleware')::post('/api/jobs', 'JobController@create');
Router::middleware('AuthMiddleware')::put('/api/jobs/{id}', 'JobController@update');
Router::middleware('AuthMiddleware')::delete('/api/jobs/{id}', 'JobController@delete');
Router::middleware('AuthMiddleware')::get('/api/jobs/my-jobs', 'JobController@myJobs');
Router::middleware('AuthMiddleware')::patch('/api/jobs/{id}/toggle-status', 'JobController@toggleStatus');
Router::middleware('AuthMiddleware')::get('/api/jobs/{id}/applications', 'JobController@jobApplications');
Router::middleware('AuthMiddleware')::get('/api/jobs/{id}/analytics', 'JobController@analytics');

// Employer only routes
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::post('/api/jobs/{id}/feature', 'JobController@markAsFeatured');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::post('/api/jobs/bulk-upload', 'JobController@bulkUpload');
