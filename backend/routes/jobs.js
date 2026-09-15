const express        = require('express');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');
const router         = express.Router();

// ── GET /api/jobs  (public, paginated, filterable) ────────────────────────────
router.get('/', async (req, res) => {
    try {
        const page     = Math.max(1, parseInt(req.query.page)     || 1);
        const perPage  = Math.min(50, Math.max(1, parseInt(req.query.per_page) || 20));
        const offset   = (page - 1) * perPage;

        const { search, category, location, job_type, experience_level, q } = req.query;
        const keyword = search || q; // support both params

        let where  = ["j.status = 'active'"];
        let params = [];

        if (keyword) {
            where.push('(j.title LIKE ? OR j.description LIKE ? OR j.company_name LIKE ?)');
            const s = `%${keyword}%`;
            params.push(s, s, s);
        }
        if (category)         { where.push('j.category = ?');          params.push(category); }
        if (location)         { where.push('j.location LIKE ?');        params.push(`%${location}%`); }
        if (job_type)         { where.push('j.job_type = ?');           params.push(job_type); }
        if (experience_level) { where.push('j.experience_level = ?');   params.push(experience_level); }

        const whereSql = 'WHERE ' + where.join(' AND ');

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total FROM jobs j ${whereSql}`, params
        );

        const [jobs] = await db.query(
            `SELECT j.*,
                    (SELECT COUNT(*) FROM applications WHERE job_id = j.id) AS applications_count
             FROM jobs j ${whereSql}
             ORDER BY j.is_featured DESC, j.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, perPage, offset]
        );

        // Parse skills JSON safely
        const parsed = jobs.map(j => ({
            ...j,
            skills: safeParseJSON(j.skills, []),
        }));

        return res.json({
            status: 'success',
            data: parsed,
            pagination: {
                total,
                per_page:    perPage,
                current_page: page,
                total_pages: Math.ceil(total / perPage),
            }
        });

    } catch (err) {
        console.error('Jobs list error:', err);
        return res.status(500).json({ status: 'error', message: 'Server error' });
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
        return res.json({ status: 'success', data: parsed });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── GET /api/jobs/companies  (distinct company list) ─────────────────────────
router.get('/companies', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT company_name,
                    COUNT(*) AS job_count,
                    MAX(location) AS location
             FROM jobs WHERE status = 'active'
             GROUP BY company_name
             ORDER BY job_count DESC
             LIMIT 50`
        );
        return res.json({ status: 'success', data: rows });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── GET /api/jobs/:id ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!id || isNaN(id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid job ID' });
        }

        const [rows] = await db.query(
            `SELECT j.*, u.full_name AS employer_name,
                    (SELECT COUNT(*) FROM applications WHERE job_id = j.id) AS applications_count
             FROM jobs j LEFT JOIN users u ON j.user_id = u.id
             WHERE j.id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Job not found' });
        }

        // Increment view count (fire-and-forget)
        db.query('UPDATE jobs SET views = views + 1 WHERE id = ?', [id]).catch(() => {});

        const job = { ...rows[0], skills: safeParseJSON(rows[0].skills, []) };
        return res.json({ status: 'success', data: job });
    } catch (err) {
        console.error('Job detail error:', err);
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── POST /api/jobs  (employer/admin only) ─────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
    try {
        if (!['employer', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ status: 'error', message: 'Only employers can post jobs' });
        }

        const {
            title, description, company_name, location, job_type,
            category, experience_level, salary_min, salary_max,
            skills, requirements, benefits, application_deadline,
        } = req.body;

        if (!title || !description || !company_name || !location) {
            return res.status(400).json({ status: 'error', message: 'title, description, company_name and location are required' });
        }

        const [result] = await db.query(
            `INSERT INTO jobs
             (user_id, title, description, company_name, location, job_type, category,
              experience_level, salary_min, salary_max, skills, requirements, benefits,
              application_deadline, status, is_featured, views, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, 0, NOW())`,
            [
                req.user.id, title, description, company_name, location,
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

        return res.status(201).json({
            status: 'success',
            message: 'Job posted successfully',
            data: { id: result.insertId },
        });

    } catch (err) {
        console.error('Post job error:', err);
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── PUT /api/jobs/:id ─────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [rows] = await db.query('SELECT user_id FROM jobs WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ status: 'error', message: 'Job not found' });

        if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ status: 'error', message: 'Not authorized' });
        }

        const fields = [
            'title', 'description', 'location', 'job_type', 'category',
            'experience_level', 'salary_min', 'salary_max',
            'requirements', 'benefits', 'application_deadline', 'status',
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

        if (updates.length === 0) return res.status(400).json({ status: 'error', message: 'Nothing to update' });

        values.push(id);
        await db.query(`UPDATE jobs SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);

        return res.json({ status: 'success', message: 'Job updated' });

    } catch (err) {
        console.error('Update job error:', err);
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── DELETE /api/jobs/:id ──────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [rows] = await db.query('SELECT user_id FROM jobs WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ status: 'error', message: 'Job not found' });

        if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ status: 'error', message: 'Not authorized' });
        }

        await db.query('DELETE FROM jobs WHERE id = ?', [id]);
        return res.json({ status: 'success', message: 'Job deleted' });

    } catch (err) {
        console.error('Delete job error:', err);
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeParseJSON(val, fallback) {
    if (!val) return fallback;
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return fallback; }
}

module.exports = router;
