const express  = require('express');
const db       = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { requireRole }    = require('../middleware/role');
const { success, error } = require('../utils/response');

const router = express.Router();

// All admin routes strictly require role: 'admin'
router.use(authMiddleware, requireRole('admin'));

// ── GET /api/admin/overview ───────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
    try {
        const [[totalUsers]] = await db.query('SELECT COUNT(*) AS c FROM users');
        const [[jobSeekers]] = await db.query("SELECT COUNT(*) AS c FROM users WHERE role = 'job_seeker'");
        const [[employers]]  = await db.query("SELECT COUNT(*) AS c FROM users WHERE role = 'employer'");
        const [[bannedUsers]]= await db.query("SELECT COUNT(*) AS c FROM users WHERE status = 'banned'");

        const [[totalJobs]]  = await db.query('SELECT COUNT(*) AS c FROM jobs');
        const [[activeJobs]] = await db.query("SELECT COUNT(*) AS c FROM jobs WHERE status = 'active'");
        const [[featuredJobs]]= await db.query("SELECT COUNT(*) AS c FROM jobs WHERE is_featured = 1");

        const [[totalApps]]  = await db.query('SELECT COUNT(*) AS c FROM applications');
        const [[pendingApps]]= await db.query("SELECT COUNT(*) AS c FROM applications WHERE status = 'pending'");
        const [[interviewApps]]= await db.query("SELECT COUNT(*) AS c FROM applications WHERE status = 'interview'");
        const [[offeredApps]]= await db.query("SELECT COUNT(*) AS c FROM applications WHERE status = 'offered'");

        // Recent users
        const [recentUsers] = await db.query(
            'SELECT id, full_name, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 5'
        );

        // Recent applications
        const [recentApps] = await db.query(
            `SELECT a.id, a.status, a.created_at, u.full_name AS applicant_name, j.title AS job_title, j.company_name
             FROM applications a
             JOIN users u ON a.user_id = u.id
             JOIN jobs j ON a.job_id = j.id
             ORDER BY a.created_at DESC LIMIT 6`
        );

        return success(res, {
            users: {
                total: totalUsers.c,
                job_seekers: jobSeekers.c,
                employers: employers.c,
                banned: bannedUsers.c,
            },
            jobs: {
                total: totalJobs.c,
                active: activeJobs.c,
                featured: featuredJobs.c,
            },
            applications: {
                total: totalApps.c,
                pending: pendingApps.c,
                interviews: interviewApps.c,
                offered: offeredApps.c,
            },
            recent_users: recentUsers,
            recent_applications: recentApps,
        }, 'Admin overview statistics');
    } catch (err) {
        console.error('Admin overview error:', err);
        return error(res, 'Server error loading admin overview', 500);
    }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
    try {
        const page    = Math.max(1, parseInt(req.query.page)     || 1);
        const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page) || 20));
        const offset  = (page - 1) * perPage;
        const search  = req.query.search ? `%${req.query.search}%` : null;

        let where = ['1=1'];
        let params = [];

        if (search) {
            where.push('(full_name LIKE ? OR email LIKE ?)');
            params.push(search, search);
        }

        const whereSql = 'WHERE ' + where.join(' AND ');
        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users ${whereSql}`, params);

        const [users] = await db.query(
            `SELECT id, full_name, email, role, status, phone, created_at
             FROM users ${whereSql}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, perPage, offset]
        );

        return success(res, users, 'Users list', 200, {
            total,
            per_page: perPage,
            current_page: page,
            total_pages: Math.ceil(total / perPage),
        });
    } catch (err) {
        return error(res, 'Server error fetching users', 500);
    }
});

// ── PATCH /api/admin/users/:id/ban ────────────────────────────────────────────
router.patch('/users/:id/ban', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (id === req.user.id) return error(res, 'Cannot ban yourself', 400);

        await db.query("UPDATE users SET status = 'banned', updated_at = NOW() WHERE id = ?", [id]);
        return success(res, { id, status: 'banned' }, 'User account banned');
    } catch (err) {
        return error(res, 'Server error banning user', 500);
    }
});

// ── PATCH /api/admin/users/:id/unban ──────────────────────────────────────────
router.patch('/users/:id/unban', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.query("UPDATE users SET status = 'active', updated_at = NOW() WHERE id = ?", [id]);
        return success(res, { id, status: 'active' }, 'User account unbanned');
    } catch (err) {
        return error(res, 'Server error unbanning user', 500);
    }
});

// ── PATCH /api/admin/users/:id/role ───────────────────────────────────────────
router.patch('/users/:id/role', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { role } = req.body;
        if (!['admin', 'employer', 'job_seeker'].includes(role)) {
            return error(res, 'Invalid role specification', 400);
        }

        await db.query("UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?", [role, id]);
        return success(res, { id, role }, `User role updated to ${role}`);
    } catch (err) {
        return error(res, 'Server error updating role', 500);
    }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (id === req.user.id) return error(res, 'Cannot delete yourself', 400);

        await db.query('DELETE FROM users WHERE id = ?', [id]);
        return success(res, {}, 'User and associated data permanently deleted');
    } catch (err) {
        return error(res, 'Server error deleting user', 500);
    }
});

// ── GET /api/admin/jobs ───────────────────────────────────────────────────────
router.get('/jobs', async (req, res) => {
    try {
        const page    = Math.max(1, parseInt(req.query.page)     || 1);
        const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page) || 20));
        const offset  = (page - 1) * perPage;

        const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM jobs');
        const [jobs] = await db.query(
            `SELECT j.*, u.full_name AS employer_name, u.email AS employer_email,
                    (SELECT COUNT(*) FROM applications WHERE job_id = j.id) AS applications_count
             FROM jobs j
             LEFT JOIN users u ON j.user_id = u.id
             ORDER BY j.created_at DESC
             LIMIT ? OFFSET ?`,
            [perPage, offset]
        );

        return success(res, jobs, 'All jobs retrieved', 200, {
            total,
            per_page: perPage,
            current_page: page,
            total_pages: Math.ceil(total / perPage),
        });
    } catch (err) {
        return error(res, 'Server error fetching jobs', 500);
    }
});

// ── PATCH /api/admin/jobs/:id/feature ─────────────────────────────────────────
router.patch('/jobs/:id/feature', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [rows] = await db.query('SELECT is_featured FROM jobs WHERE id = ?', [id]);
        if (rows.length === 0) return error(res, 'Job not found', 404);

        const newFeatured = rows[0].is_featured ? 0 : 1;
        await db.query('UPDATE jobs SET is_featured = ?, updated_at = NOW() WHERE id = ?', [newFeatured, id]);

        return success(res, { id, is_featured: newFeatured }, `Job ${newFeatured ? 'marked as featured' : 'unfeatured'}`);
    } catch (err) {
        return error(res, 'Server error toggling featured status', 500);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN SECURITY CENTER
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/security/overview ──────────────────────────────────────────
router.get('/security/overview', async (req, res) => {
    try {
        const [[totalChecks]]   = await db.query('SELECT COUNT(*) AS c FROM security_checks').catch(() => [[{ c: 0 }]]);
        const [[highRiskChecks]]= await db.query("SELECT COUNT(*) AS c FROM security_checks WHERE risk_level = 'HIGH_RISK'").catch(() => [[{ c: 0 }]]);
        const [[totalReports]]  = await db.query('SELECT COUNT(*) AS c FROM job_security_reports').catch(() => [[{ c: 0 }]]);
        const [[pendingReports]]= await db.query("SELECT COUNT(*) AS c FROM job_security_reports WHERE admin_review_status = 'pending'").catch(() => [[{ c: 0 }]]);
        const [[investigating]] = await db.query("SELECT COUNT(*) AS c FROM job_security_reports WHERE admin_review_status = 'investigating'").catch(() => [[{ c: 0 }]]);
        const [[actionTaken]]   = await db.query("SELECT COUNT(*) AS c FROM job_security_reports WHERE admin_review_status = 'action_taken'").catch(() => [[{ c: 0 }]]);
        const [[suspendedJobs]] = await db.query("SELECT COUNT(*) AS c FROM jobs WHERE status = 'inactive' OR status = 'closed'").catch(() => [[{ c: 0 }]]);

        return success(res, {
            total_checks: totalChecks?.c || 0,
            high_risk_checks: highRiskChecks?.c || 0,
            total_reports: totalReports?.c || 0,
            pending_reports: pendingReports?.c || 0,
            investigating_reports: investigating?.c || 0,
            action_taken_reports: actionTaken?.c || 0,
            suspended_jobs: suspendedJobs?.c || 0,
        }, 'Security center overview');
    } catch (err) {
        console.error('Admin security overview error:', err);
        return error(res, 'Failed to load security center overview', 500);
    }
});

// ── GET /api/admin/security/reports ───────────────────────────────────────────
router.get('/security/reports', async (req, res) => {
    try {
        const page    = Math.max(1, parseInt(req.query.page)     || 1);
        const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page) || 20));
        const offset  = (page - 1) * perPage;
        const status  = req.query.status || null;

        let where = ['1=1'];
        let params = [];

        if (status && status !== 'all') {
            where.push('r.admin_review_status = ?');
            params.push(status);
        }

        const whereSql = 'WHERE ' + where.join(' AND ');
        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM job_security_reports r ${whereSql}`, params).catch(() => [[{ total: 0 }]]);

        const [reports] = await db.query(`
            SELECT r.*,
                   j.title AS job_title, j.company_name, j.status AS job_status, j.user_id AS recruiter_id,
                   u.full_name AS recruiter_name, u.email AS recruiter_email, u.status AS recruiter_status
            FROM job_security_reports r
            LEFT JOIN jobs j ON r.job_id = j.id
            LEFT JOIN users u ON j.user_id = u.id
            ${whereSql}
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, perPage, offset]).catch(() => [[]]);

        return success(res, reports, 'Job security reports', 200, {
            total: total || 0,
            per_page: perPage,
            current_page: page,
            total_pages: Math.ceil((total || 0) / perPage),
        });
    } catch (err) {
        console.error('Admin security reports error:', err);
        return error(res, 'Failed to fetch security reports', 500);
    }
});

// ── GET /api/admin/security/checks ────────────────────────────────────────────
router.get('/security/checks', async (req, res) => {
    try {
        const limit = Math.min(50, parseInt(req.query.limit) || 20);
        const [checks] = await db.query(`
            SELECT c.*, u.full_name AS user_name, u.email AS user_email
            FROM security_checks c
            LEFT JOIN users u ON c.user_id = u.id
            ORDER BY c.checked_at DESC
            LIMIT ?
        `, [limit]).catch(() => [[]]);

        return success(res, checks, 'Recent URL security checks');
    } catch (err) {
        return error(res, 'Failed to fetch security checks', 500);
    }
});

// ── PATCH /api/admin/security/reports/:id/status ──────────────────────────────
router.patch('/security/reports/:id/status', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { status, admin_notes } = req.body;

        const validStatuses = ['pending', 'investigating', 'dismissed', 'action_taken', 'resolved'];
        if (!validStatuses.includes(status)) {
            return error(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
        }

        await db.query(`
            UPDATE job_security_reports
            SET admin_review_status = ?, admin_notes = COALESCE(?, admin_notes), reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
            WHERE id = ?
        `, [status, admin_notes || null, req.user.id, id]);

        // Record audit event
        await db.query(`
            INSERT INTO security_events (user_id, event_type, severity, details, created_at)
            VALUES (?, 'admin_report_status_updated', 'medium', ?, NOW())
        `, [
            req.user.id,
            JSON.stringify({ report_id: id, new_status: status, admin_notes })
        ]).catch(() => {});

        return success(res, { id, status }, `Report status updated to ${status}`);
    } catch (err) {
        console.error('Update report status error:', err);
        return error(res, 'Failed to update report status', 500);
    }
});

// ── POST /api/admin/security/jobs/:id/action ──────────────────────────────────
router.post('/security/jobs/:id/action', async (req, res) => {
    try {
        const jobId = parseInt(req.params.id, 10);
        const { action, report_id, notes } = req.body;

        const [jobs] = await db.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
        if (jobs.length === 0) return error(res, 'Job listing not found', 404);

        const job = jobs[0];

        if (action === 'remove_job') {
            await db.query('DELETE FROM jobs WHERE id = ?', [jobId]);
        } else if (action === 'suspend_job') {
            await db.query("UPDATE jobs SET status = 'inactive', updated_at = NOW() WHERE id = ?", [jobId]);
        } else if (action === 'suspend_recruiter') {
            await db.query("UPDATE jobs SET status = 'inactive', updated_at = NOW() WHERE user_id = ?", [job.user_id]);
            await db.query("UPDATE users SET status = 'banned', updated_at = NOW() WHERE id = ?", [job.user_id]);
        } else if (action === 'reinstate_job') {
            await db.query("UPDATE jobs SET status = 'active', updated_at = NOW() WHERE id = ?", [jobId]);
        } else {
            return error(res, 'Invalid security action. Options: remove_job, suspend_job, suspend_recruiter, reinstate_job', 400);
        }

        // If a report_id was associated, update its review status to action_taken
        if (report_id) {
            await db.query(`
                UPDATE job_security_reports
                SET admin_review_status = 'action_taken', admin_notes = COALESCE(?, admin_notes), reviewed_by = ?, reviewed_at = NOW()
                WHERE id = ?
            `, [notes || `Action executed: ${action}`, req.user.id, parseInt(report_id, 10)]).catch(() => {});
        }

        // Record audit event
        await db.query(`
            INSERT INTO security_events (user_id, event_type, severity, details, created_at)
            VALUES (?, 'admin_security_action_taken', 'high', ?, NOW())
        `, [
            req.user.id,
            JSON.stringify({ job_id: jobId, action, recruiter_id: job.user_id, notes })
        ]).catch(() => {});

        return success(res, { job_id: jobId, action, status: 'success' }, `Security action '${action}' applied successfully`);
    } catch (err) {
        console.error('Job security action error:', err);
        return error(res, 'Failed to apply security action', 500);
    }
});

module.exports = router;
