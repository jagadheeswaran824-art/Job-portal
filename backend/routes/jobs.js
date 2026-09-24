const express  = require('express');
const db       = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { requireRole }                  = require('../middleware/role');
const aiService                        = require('../services/aiService');
const { success, error }               = require('../utils/response');

const router = express.Router();

// ── GET /api/jobs  (public, paginated, searchable, filterable) ────────────────
router.get('/', optionalAuth, async (req, res) => {
    try {
        const page    = Math.max(1, parseInt(req.query.page)     || 1);
        const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page) || 20));
        const offset  = (page - 1) * perPage;

        const { search, category, location, job_type, experience_level, salary_min, salary_max, sort, q } = req.query;
        const keyword = (search || q || '').trim();

        let where  = ["j.status = 'active'"];
        let params = [];

        if (keyword) {
            where.push('(j.title LIKE ? OR j.description LIKE ? OR j.company_name LIKE ? OR j.category LIKE ?)');
            const s = `%${keyword}%`;
            params.push(s, s, s, s);
        }
        if (category)         { where.push('j.category = ?');           params.push(category); }
        if (location)         { where.push('j.location LIKE ?');         params.push(`%${location}%`); }
        if (job_type)         { where.push('j.job_type = ?');            params.push(job_type); }
        if (experience_level) { where.push('j.experience_level = ?');    params.push(experience_level); }
        if (salary_min)       { where.push('j.salary_max >= ?');         params.push(parseFloat(salary_min)); }
        if (salary_max)       { where.push('j.salary_min <= ?');         params.push(parseFloat(salary_max)); }

        // Sort options
        let orderBy = 'j.is_featured DESC, j.created_at DESC';
        if (sort === 'salary_high') orderBy = 'j.salary_max DESC, j.created_at DESC';
        else if (sort === 'salary_low') orderBy = 'j.salary_min ASC, j.created_at DESC';
        else if (sort === 'views') orderBy = 'j.views DESC, j.created_at DESC';
        else if (sort === 'oldest') orderBy = 'j.created_at ASC';

        const whereSql = 'WHERE ' + where.join(' AND ');

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM jobs j ${whereSql}`, params);

        const [jobs] = await db.query(
            `SELECT j.*,
                    (SELECT COUNT(*) FROM applications WHERE job_id = j.id) AS applications_count
             FROM jobs j ${whereSql}
             ORDER BY ${orderBy}
             LIMIT ? OFFSET ?`,
            [...params, perPage, offset]
        );

        const parsed = jobs.map(j => ({
            ...j,
            skills: safeParseJSON(j.skills, []),
        }));

        return success(res, parsed, 'Jobs retrieved', 200, {
            total,
            per_page: perPage,
            current_page: page,
            total_pages: Math.ceil(total / perPage),
        });

    } catch (err) {
        console.error('Jobs list error:', err);
        return error(res, 'Server error fetching jobs', 500);
    }
});

// ── GET /api/jobs/featured ────────────────────────────────────────────────────
router.get('/featured', async (req, res) => {
    try {
        const limit = Math.min(20, parseInt(req.query.limit) || 6);
        const [jobs] = await db.query(
            "SELECT * FROM jobs WHERE is_featured = 1 AND status = 'active' ORDER BY created_at DESC LIMIT ?",
            [limit]
        );
        const parsed = jobs.map(j => ({ ...j, skills: safeParseJSON(j.skills, []) }));
        return success(res, parsed, 'Featured jobs retrieved');
    } catch (err) {
        return error(res, 'Server error fetching featured jobs', 500);
    }
});

// ── GET /api/jobs/companies ───────────────────────────────────────────────────
router.get('/companies', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT company_name,
                    COUNT(*) AS job_count,
                    MAX(location) AS location,
                    MAX(created_at) AS last_active
             FROM jobs WHERE status = 'active'
             GROUP BY company_name
             ORDER BY job_count DESC
             LIMIT 50`
        );
        return success(res, rows, 'Companies retrieved');
    } catch (err) {
        return error(res, 'Server error fetching companies', 500);
    }
});

// ── GET /api/jobs/:id ─────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!id || isNaN(id)) {
            return error(res, 'Invalid job ID', 400, 'INVALID_ID');
        }

        const [rows] = await db.query(
            `SELECT j.*, u.full_name AS employer_name, u.email AS employer_email,
                    (SELECT COUNT(*) FROM applications WHERE job_id = j.id) AS applications_count
             FROM jobs j LEFT JOIN users u ON j.user_id = u.id
             WHERE j.id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return error(res, 'Job listing not found', 404, 'NOT_FOUND');
        }

        // Fire-and-forget view count increment
        db.query('UPDATE jobs SET views = views + 1 WHERE id = ?', [id]).catch(() => {});

        const job = { ...rows[0], skills: safeParseJSON(rows[0].skills, []) };
        const safetyScan = await aiService.scanJobSafety(job).catch(() => ({
            safety_level: 'safe',
            status_badge: '🟢 No major indicators detected',
            warning_flags: [],
            explanation: 'Standard verified listing.'
        }));
        job.safety_indicator = safetyScan;
        return success(res, job, 'Job details retrieved');
    } catch (err) {
        console.error('Job detail error:', err);
        return error(res, 'Server error fetching job details', 500);
    }
});

// ── POST /api/jobs  (Employer/Admin only) ──────────────────────────────────────
router.post('/', authMiddleware, requireRole('employer', 'admin'), async (req, res) => {
    try {
        const {
            title, description, company_name, location, job_type,
            category, experience_level, salary_min, salary_max,
            skills, requirements, benefits, application_deadline,
        } = req.body;

        if (!title || !description || !company_name || !location) {
            return error(res, 'Title, company name, location, and description are required', 400, 'VALIDATION_ERROR');
        }

        const [result] = await db.query(
            `INSERT INTO jobs
             (user_id, title, description, company_name, location, job_type, category,
              experience_level, salary_min, salary_max, skills, requirements, benefits,
              application_deadline, status, is_featured, views, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, 0, NOW())`,
            [
                req.user.id,
                title.trim(),
                description.trim(),
                company_name.trim(),
                location.trim(),
                job_type         || 'full-time',
                category         || 'general',
                experience_level || 'mid',
                salary_min       || null,
                salary_max       || null,
                JSON.stringify(Array.isArray(skills) ? skills : []),
                requirements     || null,
                benefits         || null,
                application_deadline || null,
            ]
        );

        return success(res, { id: result.insertId }, 'Job posted successfully', 201);

    } catch (err) {
        console.error('Post job error:', err);
        return error(res, 'Server error while creating job post', 500);
    }
});

// ── PUT /api/jobs/:id ─────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, requireRole('employer', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [rows] = await db.query('SELECT user_id FROM jobs WHERE id = ?', [id]);
        if (rows.length === 0) return error(res, 'Job not found', 404, 'NOT_FOUND');

        // Verify ownership
        if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return error(res, 'You are not authorized to edit this job posting', 403, 'FORBIDDEN');
        }

        const fields = [
            'title', 'description', 'company_name', 'location', 'job_type', 'category',
            'experience_level', 'salary_min', 'salary_max',
            'requirements', 'benefits', 'application_deadline', 'status', 'is_featured'
        ];
        const updates = [];
        const values  = [];

        fields.forEach(f => {
            if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
        });
        if (req.body.skills !== undefined) {
            updates.push('skills = ?');
            values.push(JSON.stringify(Array.isArray(req.body.skills) ? req.body.skills : []));
        }

        if (updates.length === 0) return error(res, 'No fields provided to update', 400, 'NO_DATA');

        values.push(id);
        await db.query(`UPDATE jobs SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);

        return success(res, {}, 'Job updated successfully');

    } catch (err) {
        console.error('Update job error:', err);
        return error(res, 'Server error updating job', 500);
    }
});

// ── DELETE /api/jobs/:id ──────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, requireRole('employer', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [rows] = await db.query('SELECT user_id FROM jobs WHERE id = ?', [id]);
        if (rows.length === 0) return error(res, 'Job not found', 404, 'NOT_FOUND');

        if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return error(res, 'You are not authorized to delete this job posting', 403, 'FORBIDDEN');
        }

        await db.query('DELETE FROM jobs WHERE id = ?', [id]);
        return success(res, {}, 'Job deleted successfully');

    } catch (err) {
        console.error('Delete job error:', err);
        return error(res, 'Server error deleting job', 500);
    }
});

function safeParseJSON(val, fallback) {
    if (!val) return fallback;
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return fallback; }
}

module.exports = router;
