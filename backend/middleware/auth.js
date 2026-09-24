const jwt = require('jsonwebtoken');
const db  = require('../db');
const { error } = require('../utils/response');

async function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return error(res, 'No authentication token provided', 401, 'NO_TOKEN');
    }

    try {
        // Verify signature and expiration
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if token has been blacklisted on logout
        try {
            const [blacklisted] = await db.query(
                'SELECT id FROM token_blacklist WHERE token = ? AND expires_at > NOW()',
                [token]
            );
            if (blacklisted.length > 0) {
                return error(res, 'Session has expired or was logged out. Please sign in again.', 401, 'TOKEN_REVOKED');
            }
        } catch (dbErr) {
            // If table check fails temporarily, allow verified token through
            console.error('Blacklist check warning:', dbErr.message);
        }

        req.user  = decoded; // { id, email, role }
        req.token = token;
        next();
    } catch (err) {
        return error(res, 'Invalid or expired token. Please log in again.', 401, 'INVALID_TOKEN');
    }
}

// Optional authentication middleware for endpoints accessible publicly or privately
async function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user  = decoded;
        req.token = token;
    } catch {
        req.user = null;
    }
    next();
}

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.optionalAuth = optionalAuth;
