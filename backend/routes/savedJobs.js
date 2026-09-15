const express        = require('express');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');
const router         = express.Router();

// GET /api/saved-jobs
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT sj.id, sj.created_at, j.id AS job_id, j.title, j.company_name, j.location, j.job_type, j.salary_min, j.salary_max
             FROM saved_jobs sj JOIN jobs j ON sj.job_id = j.id
             WHERE sj.user_id = ? ORDER BY sj.created_at DESC`,
            [req.user.id]
        );
        return res.json({ status: 'success', data: rows });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// POST /api/saved-jobs
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { job_id } = req.body;
        if (!job_id) return res.status(400).json({ status: 'error', message: 'job_id required' });

        const [dup] = await db.query('SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?', [req.user.id, job_id]);
        if (dup.length > 0) return res.status(409).json({ status: 'error', message: 'Job already saved' });

        await db.query('INSERT INTO saved_jobs (user_id, job_id, created_at) VALUES (?, ?, NOW())', [req.user.id, job_id]);
        return res.status(201).json({ status: 'success', message: 'Job saved' });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// DELETE /api/saved-jobs/:jobId
router.delete('/:jobId', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?', [req.user.id, req.params.jobId]);
        return res.json({ status: 'success', message: 'Job unsaved' });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// GET /api/saved-jobs/check/:jobId
router.get('/check/:jobId', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?', [req.user.id, req.params.jobId]);
        return res.json({ status: 'success', data: { is_saved: rows.length > 0 } });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

module.exports = router;
