/**
 * Standard API Response Utility
 * Ensures consistent JSON responses across all endpoints.
 */

function success(res, data = {}, message = 'Request successful', statusCode = 200, pagination = null) {
    const payload = {
        success: true,
        status: 'success', // backward compatibility
        message,
        data,
    };
    if (pagination) {
        payload.pagination = pagination;
    }
    return res.status(statusCode).json(payload);
}

function error(res, message = 'An error occurred', statusCode = 500, code = 'SERVER_ERROR', details = null) {
    const payload = {
        success: false,
        status: 'error', // backward compatibility
        message,        // backward compatibility
        error: {
            code,
            message,
        },
    };
    if (details) {
        payload.error.details = details;
    }
    return res.status(statusCode).json(payload);
}

module.exports = { success, error };
