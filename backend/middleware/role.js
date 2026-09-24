const { error } = require('../utils/response');

/**
 * Role-Based Access Control Middleware
 * @param  {...string} allowedRoles Roles allowed to access the route ('admin', 'employer', 'job_seeker')
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return error(res, 'Authentication required', 401, 'UNAUTHORIZED');
        }

        if (!allowedRoles.includes(req.user.role) && req.user.role !== 'admin') {
            return error(
                res,
                `Access denied: required role [${allowedRoles.join(', ')}], your role is [${req.user.role}]`,
                403,
                'FORBIDDEN'
            );
        }

        next();
    };
}

module.exports = { requireRole };
