const express  = require('express');
const db       = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

// ── GET /api/analytics/overview ───────────────────────────────────────────────
router.get('/overview', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const role   = req.user.role;

        if (role === 'employer' || role === 'admin') {
            // Employer analytics
            const [statusCounts] = await db.query(
                `SELECT a.status, COUNT(*) AS count
                 FROM applications a
                 JOIN jobs j ON a.job_id = j.id
                 WHERE j.user_id = ?
                 GROUP BY a.status`,
                [userId]
            );

            const [topViewedJobs] = await db.query(
                `SELECT id, title, views,
                        (SELECT COUNT(*) FROM applications WHERE job_id = jobs.id) AS applications_count
                 FROM jobs
                 WHERE user_id = ?
                 ORDER BY views DESC
                 LIMIT 5`,
                [userId]
            );

            // Monthly application trend (last 6 months)
            const [monthlyTrend] = await db.query(
                `SELECT DATE_FORMAT(a.created_at, '%b %Y') AS month, COUNT(*) AS applications
                 FROM applications a
                 JOIN jobs j ON a.job_id = j.id
                 WHERE j.user_id = ? AND a.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                 GROUP BY month
                 ORDER BY a.created_at ASC`,
                [userId]
            );

            return success(res, {
                role,
                pipeline_breakdown: statusCounts,
                top_viewed_jobs: topViewedJobs,
                monthly_trend: monthlyTrend,
            }, 'Employer analytics');
        } else {
            // Job seeker analytics
            const [myAppStatuses] = await db.query(
                `SELECT status, COUNT(*) AS count
                 FROM applications
                 WHERE user_id = ?
                 GROUP BY status`,
                [userId]
            );

            const [[totalApplied]] = await db.query(
                'SELECT COUNT(*) AS c FROM applications WHERE user_id = ?',
                [userId]
            );

            const [[totalInterviews]] = await db.query(
                "SELECT COUNT(*) AS c FROM applications WHERE user_id = ? AND status IN ('interview', 'offered')",
                [userId]
            );

            const interviewRate = totalApplied.c > 0
                ? Math.round((totalInterviews.c / totalApplied.c) * 100)
                : 0;

            // Popular categories
            const [popularCategories] = await db.query(
                `SELECT category, COUNT(*) AS job_count
                 FROM jobs
                 WHERE status = 'active'
                 GROUP BY category
                 ORDER BY job_count DESC
                 LIMIT 6`
            );

            return success(res, {
                role,
                total_applications: totalApplied.c,
                interview_rate_percentage: interviewRate,
                status_breakdown: myAppStatuses,
                market_trends: popularCategories,
            }, 'Seeker analytics');
        }
    } catch (err) {
        console.error('Analytics error:', err);
        return error(res, 'Server error loading analytics', 500);
    }
});

module.exports = router;
