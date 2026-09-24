const { error } = require('../utils/response');

/**
 * In-memory Token-Bucket / Sliding Window Rate Limiter
 * @param {number} maxRequests Max requests permitted within the window
 * @param {number} windowMs Time window in milliseconds
 */
function createRateLimiter(maxRequests = 100, windowMs = 60 * 1000) {
    const hits = new Map();

    // Clean up expired keys periodically
    setInterval(() => {
        const now = Date.now();
        for (const [ip, record] of hits.entries()) {
            if (now - record.startTime > windowMs) {
                hits.delete(ip);
            }
        }
    }, windowMs).unref();

    return (req, res, next) => {
        const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const now = Date.now();

        let record = hits.get(clientIp);
        if (!record || now - record.startTime > windowMs) {
            record = { count: 1, startTime: now };
            hits.set(clientIp, record);
            return next();
        }

        record.count++;
        if (record.count > maxRequests) {
            const retryAfterSec = Math.ceil((record.startTime + windowMs - now) / 1000);
            res.setHeader('Retry-After', retryAfterSec);
            return error(
                res,
                `Too many requests. Please slow down and try again in ${retryAfterSec} seconds.`,
                429,
                'RATE_LIMIT_EXCEEDED'
            );
        }

        next();
    };
}

module.exports = {
    standardLimiter: createRateLimiter(200, 60 * 1000), // 200 req/min
    authLimiter:     createRateLimiter(30, 60 * 1000),  // 30 req/min
    aiLimiter:       createRateLimiter(20, 60 * 1000),  // 20 req/min
    createRateLimiter,
};
