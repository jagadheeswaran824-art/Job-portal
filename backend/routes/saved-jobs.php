<?php
/**
 * Saved Jobs Routes
 */

// All routes require authentication
Router::middleware('AuthMiddleware')::get('/api/saved-jobs', 'SavedJobController@index');
Router::middleware('AuthMiddleware')::post('/api/saved-jobs', 'SavedJobController@save');
Router::middleware('AuthMiddleware')::delete('/api/saved-jobs/{jobId}', 'SavedJobController@unsave');
Router::middleware('AuthMiddleware')::get('/api/saved-jobs/check/{jobId}', 'SavedJobController@isSaved');
Router::middleware('AuthMiddleware')::get('/api/saved-jobs/count', 'SavedJobController@count');
