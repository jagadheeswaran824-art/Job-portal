<?php
/**
 * Admin Routes
 * All routes require authentication and admin role
 */

// User Management
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::get('/api/admin/users', 'AdminController@users');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::get('/api/admin/users/{id}', 'AdminController@userDetails');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::patch('/api/admin/users/{id}/ban', 'AdminController@banUser');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::patch('/api/admin/users/{id}/unban', 'AdminController@unbanUser');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::delete('/api/admin/users/{id}', 'AdminController@deleteUser');

// Job Management
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::get('/api/admin/jobs', 'AdminController@jobs');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::patch('/api/admin/jobs/{id}/approve', 'AdminController@approveJob');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::patch('/api/admin/jobs/{id}/reject', 'AdminController@rejectJob');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::delete('/api/admin/jobs/{id}', 'AdminController@deleteJob');

// Analytics & Reports
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::get('/api/admin/analytics/overview', 'AdminController@analyticsOverview');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::get('/api/admin/analytics/users', 'AdminController@userAnalytics');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::get('/api/admin/analytics/jobs', 'AdminController@jobAnalytics');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::get('/api/admin/analytics/applications', 'AdminController@applicationAnalytics');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::get('/api/admin/reports/generate', 'AdminController@generateReport');

// System Settings
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::get('/api/admin/settings', 'AdminController@getSettings');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::put('/api/admin/settings', 'AdminController@updateSettings');

// Content Moderation
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::get('/api/admin/flagged-content', 'AdminController@flaggedContent');
Router::middleware('AuthMiddleware')::middleware('RoleMiddleware')::post('/api/admin/moderate/{type}/{id}', 'AdminController@moderateContent');
