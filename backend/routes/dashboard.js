const express        = require('express');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');
const router         = express.Router();

// GET /api/dashboard/overview
router.get('/overview', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const role   = req.user.role;

        if (role === 'employer' || role === 'admin') {
            // ── Employer / Admin dashboard ─────────────────────────────────
            const [[jobsPosted]]     = await db.query(
                "SELECT COUNT(*) AS c FROM jobs WHERE user_id = ?", [userId]
            );
            const [[activeJobs]]     = await db.query(
                "SELECT COUNT(*) AS c FROM jobs WHERE user_id = ? AND status = 'active'", [userId]
            );
            const [[totalApps]]      = await db.query(
                `SELECT COUNT(*) AS c FROM applications a
                 JOIN jobs j ON a.job_id = j.id WHERE j.user_id = ?`, [userId]
            );
            const [[newApps]]        = await db.query(
                `SELECT COUNT(*) AS c FROM applications a
                 JOIN jobs j ON a.job_id = j.id
                 WHERE j.user_id = ? AND a.status = 'pending'`, [userId]
            );
            const [[totalJobCount]]  = await db.query(
                "SELECT COUNT(*) AS c FROM jobs WHERE status = 'active'"
            );

            const [recentApps] = await db.query(
                `SELECT a.id, a.status, a.created_at,
                        j.title AS job_title, j.company_name,
                        u.full_name AS applicant_name, u.email AS applicant_email
                 FROM applications a
                 JOIN jobs j ON a.job_id = j.id
                 JOIN users u ON a.user_id = u.id
                 WHERE j.user_id = ?
                 ORDER BY a.created_at DESC LIMIT 8`, [userId]
            );

            const [myJobs] = await db.query(
                `SELECT id, title, company_name, status,
                        (SELECT COUNT(*) FROM applications WHERE job_id = jobs.id) AS application_count,
                        views, created_at
                 FROM jobs WHERE user_id = ?
                 ORDER BY created_at DESC LIMIT 6`, [userId]
            );

            return res.json({
                status: 'success',
                data: {
                    role,
                    statistics: {
                        jobs_posted:    jobsPosted.c,
                        active_jobs:    activeJobs.c,
                        total_applicants: totalApps.c,
                        new_applicants:   newApps.c,
                        total_jobs:       totalJobCount.c,
                    },
                    recent_applications: recentApps,
                    my_jobs: myJobs,
                    notifications: [],
                }
            });
        }

        // ── Job Seeker dashboard ───────────────────────────────────────────
        const [[appCount]]   = await db.query(
            'SELECT COUNT(*) AS c FROM applications WHERE user_id = ?', [userId]
        );
        const [[savedCount]] = await db.query(
            'SELECT COUNT(*) AS c FROM saved_jobs WHERE user_id = ?', [userId]
        );
        const [[jobCount]]   = await db.query(
            "SELECT COUNT(*) AS c FROM jobs WHERE status = 'active'"
        );
        const [[interviewCount]] = await db.query(
            "SELECT COUNT(*) AS c FROM applications WHERE user_id = ? AND status = 'interview'", [userId]
        );

        const [recentApps] = await db.query(
            `SELECT a.id, a.status, a.created_at,
                    j.title AS job_title, j.company_name, j.location, j.job_type
             FROM applications a JOIN jobs j ON a.job_id = j.id
             WHERE a.user_id = ? ORDER BY a.created_at DESC LIMIT 8`, [userId]
        );

        const [savedJobs] = await db.query(
            `SELECT sj.id, sj.created_at,
                    j.id AS job_id, j.title, j.company_name, j.location, j.job_type,
                    j.salary_min, j.salary_max
             FROM saved_jobs sj JOIN jobs j ON sj.job_id = j.id
             WHERE sj.user_id = ? ORDER BY sj.created_at DESC LIMIT 5`, [userId]
        );

        return res.json({
            status: 'success',
            data: {
                role,
                statistics: {
                    applications:    appCount.c,
                    saved_jobs:      savedCount.c,
                    total_jobs:      jobCount.c,
                    interviews:      interviewCount.c,
                },
                recent_applications: recentApps,
                saved_jobs:  savedJobs,
                notifications: [],
            }
        });

    } catch (err) {
        console.error('Dashboard error:', err);
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

module.exports = router;
