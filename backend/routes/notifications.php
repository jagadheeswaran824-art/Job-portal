<?php
/**
 * Notification Routes
 */

// All routes require authentication
Router::middleware('AuthMiddleware')::get('/api/notifications', 'NotificationController@index');
Router::middleware('AuthMiddleware')::get('/api/notifications/{id}', 'NotificationController@show');
Router::middleware('AuthMiddleware')::patch('/api/notifications/{id}/read', 'NotificationController@markAsRead');
Router::middleware('AuthMiddleware')::patch('/api/notifications/read-all', 'NotificationController@markAllAsRead');
Router::middleware('AuthMiddleware')::delete('/api/notifications/{id}', 'NotificationController@delete');
Router::middleware('AuthMiddleware')::delete('/api/notifications/clear-all', 'NotificationController@clearAll');
Router::middleware('AuthMiddleware')::get('/api/notifications/unread/count', 'NotificationController@unreadCount');
Router::middleware('AuthMiddleware')::get('/api/notifications/settings', 'NotificationController@getSettings');
Router::middleware('AuthMiddleware')::put('/api/notifications/settings', 'NotificationController@updateSettings');
