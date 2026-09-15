<?php
/**
 * Authentication Routes
 */

// Public routes (no authentication required)
Router::post('/api/auth/register', 'AuthController@register');
Router::post('/api/auth/login', 'AuthController@login');
Router::post('/api/auth/refresh', 'AuthController@refreshToken');
Router::post('/api/auth/forgot-password', 'AuthController@forgotPassword');
Router::post('/api/auth/reset-password', 'AuthController@resetPassword');
Router::post('/api/auth/verify-email', 'AuthController@verifyEmail');

// Protected routes (authentication required)
Router::middleware('AuthMiddleware')::post('/api/auth/logout', 'AuthController@logout');
Router::middleware('AuthMiddleware')::get('/api/auth/me', 'AuthController@me');
Router::middleware('AuthMiddleware')::post('/api/auth/change-password', 'AuthController@changePassword');
