<?php
/**
 * User Routes
 */

// All user routes require authentication
Router::middleware('AuthMiddleware')::get('/api/users', 'UserController@index');
Router::middleware('AuthMiddleware')::get('/api/users/{id}', 'UserController@show');
Router::middleware('AuthMiddleware')::put('/api/users/{id}', 'UserController@update');
Router::middleware('AuthMiddleware')::delete('/api/users/{id}', 'UserController@delete');
Router::middleware('AuthMiddleware')::post('/api/users/{id}/upload-avatar', 'UserController@uploadAvatar');

// Admin only routes
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::get('/api/users/admin/list', 'UserController@adminList');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::put('/api/users/{id}/toggle-status', 'UserController@toggleStatus');
