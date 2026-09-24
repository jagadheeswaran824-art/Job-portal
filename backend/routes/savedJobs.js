const express  = require('express');
const db       = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

// ── GET /api/saved-jobs ───────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT sj.id, sj.created_at, j.id AS job_id, j.title, j.company_name, j.location,
                    j.job_type, j.salary_min, j.salary_max, j.category, j.skills
             FROM saved_jobs sj
             JOIN jobs j ON sj.job_id = j.id
             WHERE sj.user_id = ?
             ORDER BY sj.created_at DESC`,
            [req.user.id]
        );

        const parsed = rows.map(r => {
            let skills = r.skills;
            if (typeof skills === 'string') {
                try { skills = JSON.parse(skills); } catch { skills = []; }
            }
            return { ...r, skills: skills || [] };
        });

        return success(res, parsed, 'Saved jobs retrieved');
    } catch (err) {
        return error(res, 'Server error fetching saved jobs', 500);
    }
});

// ── POST /api/saved-jobs ──────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { job_id } = req.body;
        const jobId = parseInt(job_id);
        if (!jobId) return error(res, 'job_id is required', 400, 'VALIDATION_ERROR');

        const [dup] = await db.query('SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?', [req.user.id, jobId]);
        if (dup.length > 0) return error(res, 'Job is already saved in your bookmarks', 409, 'ALREADY_SAVED');

        const [result] = await db.query(
            'INSERT INTO saved_jobs (user_id, job_id, created_at) VALUES (?, ?, NOW())',
            [req.user.id, jobId]
        );
        return success(res, { id: result.insertId, job_id: jobId }, 'Job saved successfully', 201);
    } catch (err) {
        return error(res, 'Server error saving job', 500);
    }
});

// ── DELETE /api/saved-jobs/:jobId ─────────────────────────────────────────────
router.delete('/:jobId', authMiddleware, async (req, res) => {
    try {
        const jobId = parseInt(req.params.jobId);
        await db.query('DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?', [req.user.id, jobId]);
        return success(res, {}, 'Job removed from saved bookmarks');
    } catch (err) {
        return error(res, 'Server error removing saved job', 500);
    }
});

// ── GET /api/saved-jobs/check/:jobId ──────────────────────────────────────────
router.get('/check/:jobId', authMiddleware, async (req, res) => {
    try {
        const jobId = parseInt(req.params.jobId);
        const [rows] = await db.query('SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?', [req.user.id, jobId]);
        return success(res, { is_saved: rows.length > 0 }, 'Saved status checked');
    } catch (err) {
        return error(res, 'Server error checking saved status', 500);
    }
});

module.exports = router;
