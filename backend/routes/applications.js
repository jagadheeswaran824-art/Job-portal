const express        = require('express');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');
const router         = express.Router();

// ── GET /api/applications/my  (job seeker — their own) ───────────────────────
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const page    = parseInt(req.query.page)     || 1;
        const perPage = parseInt(req.query.per_page) || 20;
        const offset  = (page - 1) * perPage;

        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) AS total FROM applications WHERE user_id = ?', [req.user.id]
        );

        const [apps] = await db.query(
            `SELECT a.*, j.title AS job_title, j.company_name, j.location
             FROM applications a
             JOIN jobs j ON a.job_id = j.id
             WHERE a.user_id = ?
             ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
            [req.user.id, perPage, offset]
        );

        return res.json({
            status: 'success', data: apps,
            pagination: { total, per_page: perPage, current_page: page, total_pages: Math.ceil(total / perPage) }
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── GET /api/applications/job/:jobId  (employer — applicants for a job) ───────
router.get('/job/:jobId', authMiddleware, async (req, res) => {
    try {
        // Verify employer owns the job
        const [jobRows] = await db.query('SELECT user_id FROM jobs WHERE id = ?', [req.params.jobId]);
        if (jobRows.length === 0) return res.status(404).json({ status: 'error', message: 'Job not found' });

        if (jobRows[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ status: 'error', message: 'Not authorized' });
        }

        const [apps] = await db.query(
            `SELECT a.*, u.full_name AS applicant_name, u.email AS applicant_email, u.phone
             FROM applications a
             JOIN users u ON a.user_id = u.id
             WHERE a.job_id = ?
             ORDER BY a.created_at DESC`,
            [req.params.jobId]
        );

        return res.json({ status: 'success', data: apps });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── POST /api/applications  (apply for a job) ─────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { job_id, cover_letter } = req.body;

        if (!job_id) return res.status(400).json({ status: 'error', message: 'job_id is required' });

        // Prevent duplicate application
        const [dup] = await db.query(
            'SELECT id FROM applications WHERE user_id = ? AND job_id = ?',
            [req.user.id, job_id]
        );
        if (dup.length > 0) {
            return res.status(409).json({ status: 'error', message: 'You already applied for this job' });
        }

        const [result] = await db.query(
            `INSERT INTO applications (user_id, job_id, cover_letter, status, created_at)
             VALUES (?, ?, ?, 'pending', NOW())`,
            [req.user.id, job_id, cover_letter || null]
        );

        return res.status(201).json({
            status: 'success',
            message: 'Application submitted successfully',
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Apply error:', err);
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── PATCH /api/applications/:id/status  (employer updates status) ─────────────
router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'reviewing', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ status: 'error', message: 'Invalid status value' });
        }

        await db.query(
            'UPDATE applications SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, req.params.id]
        );

        return res.json({ status: 'success', message: 'Application status updated' });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── DELETE /api/applications/:id  (withdraw) ──────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT user_id FROM applications WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ status: 'error', message: 'Application not found' });

        if (rows[0].user_id !== req.user.id) {
            return res.status(403).json({ status: 'error', message: 'Not authorized' });
        }

        await db.query('DELETE FROM applications WHERE id = ?', [req.params.id]);
        return res.json({ status: 'success', message: 'Application withdrawn' });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

module.exports = router;
