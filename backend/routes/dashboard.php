<?php
/**
 * Dashboard Routes
 */

// All routes require authentication
Router::middleware('AuthMiddleware')::get('/api/dashboard/stats', 'DashboardController@stats');
Router::middleware('AuthMiddleware')::get('/api/dashboard/recent-activity', 'DashboardController@recentActivity');
Router::middleware('AuthMiddleware')::get('/api/dashboard/analytics', 'DashboardController@analytics');

// Job Seeker Dashboard
Router::middleware('AuthMiddleware')::get('/api/dashboard/job-seeker/overview', 'DashboardController@jobSeekerOverview');
Router::middleware('AuthMiddleware')::get('/api/dashboard/job-seeker/recommendations', 'DashboardController@jobRecommendations');
Router::middleware('AuthMiddleware')::get('/api/dashboard/job-seeker/application-status', 'DashboardController@applicationStatus');

// Employer Dashboard
Router::middleware('AuthMiddleware')::get('/api/dashboard/employer/overview', 'DashboardController@employerOverview');
Router::middleware('AuthMiddleware')::get('/api/dashboard/employer/job-performance', 'DashboardController@jobPerformance');
Router::middleware('AuthMiddleware')::get('/api/dashboard/employer/applicant-stats', 'DashboardController@applicantStats');
