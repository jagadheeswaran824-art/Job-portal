const express  = require('express');
const db       = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { requireRole }    = require('../middleware/role');
const { success, error } = require('../utils/response');

const router = express.Router();

// ── GET /api/applications/my  (Job seeker — their own applications) ───────────
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const page    = Math.max(1, parseInt(req.query.page)     || 1);
        const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page) || 20));
        const offset  = (page - 1) * perPage;

        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) AS total FROM applications WHERE user_id = ?', [req.user.id]
        );

        const [apps] = await db.query(
            `SELECT a.*, j.title AS job_title, j.company_name, j.location, j.job_type, j.salary_min, j.salary_max
             FROM applications a
             JOIN jobs j ON a.job_id = j.id
             WHERE a.user_id = ?
             ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
            [req.user.id, perPage, offset]
        );

        return success(res, apps, 'Applications retrieved', 200, {
            total,
            per_page: perPage,
            current_page: page,
            total_pages: Math.ceil(total / perPage),
        });
    } catch (err) {
        console.error('Fetch my applications error:', err);
        return error(res, 'Server error fetching your applications', 500);
    }
});

// ── GET /api/applications/job/:jobId  (Employer — applicants for a job) ────────
router.get('/job/:jobId', authMiddleware, async (req, res) => {
    try {
        const jobId = parseInt(req.params.jobId);
        // Verify employer owns the job or is admin
        const [jobRows] = await db.query('SELECT user_id, title FROM jobs WHERE id = ?', [jobId]);
        if (jobRows.length === 0) return error(res, 'Job listing not found', 404, 'NOT_FOUND');

        if (jobRows[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return error(res, 'You are not authorized to view applicants for this job', 403, 'FORBIDDEN');
        }

        const [apps] = await db.query(
            `SELECT a.*, u.full_name AS applicant_name, u.email AS applicant_email, u.phone, u.avatar,
                    p.headline, p.experience_years, p.location AS applicant_location
             FROM applications a
             JOIN users u ON a.user_id = u.id
             LEFT JOIN profiles p ON u.id = p.user_id
             WHERE a.job_id = ?
             ORDER BY a.created_at DESC`,
            [jobId]
        );

        return success(res, apps, `Applicants for ${jobRows[0].title}`);
    } catch (err) {
        console.error('Fetch job applicants error:', err);
        return error(res, 'Server error fetching applicants', 500);
    }
});

// ── POST /api/applications  (Apply for a job) ──────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { job_id, cover_letter, resume_path } = req.body;
        const jobId = parseInt(job_id);

        if (!jobId) return error(res, 'Job ID is required', 400, 'VALIDATION_ERROR');

        // Check if job exists and is active
        const [jobRows] = await db.query('SELECT id, user_id, title, company_name, status FROM jobs WHERE id = ?', [jobId]);
        if (jobRows.length === 0) return error(res, 'Job listing not found', 404, 'NOT_FOUND');
        if (jobRows[0].status !== 'active') return error(res, 'This job is no longer accepting applications', 400, 'JOB_CLOSED');

        const job = jobRows[0];

        // Prevent duplicate application
        const [dup] = await db.query(
            'SELECT id FROM applications WHERE user_id = ? AND job_id = ?',
            [req.user.id, jobId]
        );
        if (dup.length > 0) {
            return error(res, 'You have already applied for this job', 409, 'ALREADY_APPLIED');
        }

        const [result] = await db.query(
            `INSERT INTO applications (user_id, job_id, cover_letter, resume_path, status, created_at)
             VALUES (?, ?, ?, ?, 'pending', NOW())`,
            [req.user.id, jobId, cover_letter || null, resume_path || null]
        );

        // Notify employer of new application
        try {
            await db.query(
                `INSERT INTO notifications (user_id, type, title, message, data, created_at)
                 VALUES (?, 'new_application', ?, ?, ?, NOW())`,
                [
                    job.user_id,
                    'New Candidate Application',
                    `A new candidate applied for "${job.title}".`,
                    JSON.stringify({ application_id: result.insertId, job_id: jobId }),
                ]
            );
        } catch (notifErr) {
            console.error('Notification creation failed:', notifErr.message);
        }

        return success(
            res,
            { id: result.insertId, status: 'pending' },
            'Application submitted successfully! The employer has been notified.',
            201
        );
    } catch (err) {
        console.error('Apply error:', err);
        return error(res, 'Server error while submitting application', 500);
    }
});

// ── PATCH /api/applications/:id/status  (Employer/Admin updates status) ────────
router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const appId = parseInt(req.params.id);
        const { status, notes } = req.body;
        const validStatuses = ['pending', 'reviewing', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn'];

        if (!validStatuses.includes(status)) {
            return error(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400, 'VALIDATION_ERROR');
        }

        // Verify that employer owns the job or is admin
        const [appRows] = await db.query(
            `SELECT a.id, a.user_id AS applicant_id, a.job_id, j.user_id AS employer_id, j.title AS job_title, j.company_name
             FROM applications a
             JOIN jobs j ON a.job_id = j.id
             WHERE a.id = ?`,
            [appId]
        );

        if (appRows.length === 0) {
            return error(res, 'Application not found', 404, 'NOT_FOUND');
        }

        const application = appRows[0];

        if (application.employer_id !== req.user.id && req.user.role !== 'admin') {
            return error(res, 'You are not authorized to update this application status', 403, 'FORBIDDEN');
        }

        await db.query(
            'UPDATE applications SET status = ?, notes = COALESCE(?, notes), updated_at = NOW() WHERE id = ?',
            [status, notes || null, appId]
        );

        // Notify job seeker of status update
        try {
            await db.query(
                `INSERT INTO notifications (user_id, type, title, message, data, created_at)
                 VALUES (?, 'application_status', ?, ?, ?, NOW())`,
                [
                    application.applicant_id,
                    `Application Status: ${status.toUpperCase()}`,
                    `Your application for "${application.job_title}" at ${application.company_name} is now marked as "${status}".`,
                    JSON.stringify({ application_id: appId, job_id: application.job_id, status }),
                ]
            );
        } catch (notifErr) {
            console.error('Notification creation failed:', notifErr.message);
        }

        return success(res, { id: appId, status }, `Application status successfully updated to ${status}`);
    } catch (err) {
        console.error('Update application status error:', err);
        return error(res, 'Server error updating application status', 500);
    }
});

// ── DELETE /api/applications/:id  (Candidate withdraws application) ────────────
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const appId = parseInt(req.params.id);
        const [rows] = await db.query('SELECT user_id FROM applications WHERE id = ?', [appId]);
        if (rows.length === 0) return error(res, 'Application not found', 404, 'NOT_FOUND');

        if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return error(res, 'You are not authorized to withdraw this application', 403, 'FORBIDDEN');
        }

        await db.query('DELETE FROM applications WHERE id = ?', [appId]);
        return success(res, {}, 'Application withdrawn successfully');
    } catch (err) {
        return error(res, 'Server error withdrawing application', 500);
    }
});

module.exports = router;
