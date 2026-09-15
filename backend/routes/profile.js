const express        = require('express');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');
const router         = express.Router();

// ── GET /api/profile  (own profile) ──────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, full_name, email, role, phone, avatar, status, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ status: 'error', message: 'User not found' });

        const user = rows[0];

        // Fetch extended profile
        const [profile]    = await db.query('SELECT * FROM profiles WHERE user_id = ?',           [req.user.id]);
        const [skills]     = await db.query('SELECT * FROM profile_skills WHERE user_id = ?',     [req.user.id]);
        const [experience] = await db.query('SELECT * FROM profile_experience WHERE user_id = ? ORDER BY start_date DESC', [req.user.id]);
        const [education]  = await db.query('SELECT * FROM profile_education WHERE user_id = ? ORDER BY start_date DESC',  [req.user.id]);

        return res.json({
            status: 'success',
            data: {
                ...user,
                profile:    profile[0]  || {},
                skills,
                experience,
                education
            }
        });
    } catch (err) {
        console.error('Profile fetch error:', err);
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── PUT /api/profile  (update basic info) ────────────────────────────────────
router.put('/', authMiddleware, async (req, res) => {
    try {
        const { full_name, phone } = req.body;
        const updates = [];
        const values  = [];

        if (full_name) { updates.push('full_name = ?'); values.push(full_name); }
        if (phone)     { updates.push('phone = ?');     values.push(phone); }

        if (updates.length > 0) {
            values.push(req.user.id);
            await db.query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
        }

        // Upsert profile details
        const profileFields = ['bio','headline','location','website','linkedin','github','experience_years','expected_salary'];
        const profileData   = {};
        profileFields.forEach(f => { if (req.body[f] !== undefined) profileData[f] = req.body[f]; });

        if (Object.keys(profileData).length > 0) {
            const [existing] = await db.query('SELECT id FROM profiles WHERE user_id = ?', [req.user.id]);

            if (existing.length > 0) {
                const cols = Object.keys(profileData).map(k => `${k} = ?`).join(', ');
                await db.query(
                    `UPDATE profiles SET ${cols}, updated_at = NOW() WHERE user_id = ?`,
                    [...Object.values(profileData), req.user.id]
                );
            } else {
                const cols = ['user_id', ...Object.keys(profileData)].join(', ');
                const placeholders = Array(Object.keys(profileData).length + 1).fill('?').join(', ');
                await db.query(
                    `INSERT INTO profiles (${cols}, created_at) VALUES (${placeholders}, NOW())`,
                    [req.user.id, ...Object.values(profileData)]
                );
            }
        }

        return res.json({ status: 'success', message: 'Profile updated' });
    } catch (err) {
        console.error('Profile update error:', err);
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── POST /api/profile/skills ──────────────────────────────────────────────────
router.post('/skills', authMiddleware, async (req, res) => {
    try {
        const { skill_name, proficiency_level = 'intermediate' } = req.body;
        if (!skill_name) return res.status(400).json({ status: 'error', message: 'skill_name is required' });

        const [result] = await db.query(
            'INSERT INTO profile_skills (user_id, skill_name, proficiency_level, created_at) VALUES (?, ?, ?, NOW())',
            [req.user.id, skill_name, proficiency_level]
        );
        return res.status(201).json({ status: 'success', message: 'Skill added', data: { id: result.insertId } });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── DELETE /api/profile/skills/:id ───────────────────────────────────────────
router.delete('/skills/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM profile_skills WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        return res.json({ status: 'success', message: 'Skill removed' });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── POST /api/profile/experience ──────────────────────────────────────────────
router.post('/experience', authMiddleware, async (req, res) => {
    try {
        const { company, position, description, start_date, end_date, is_current = false } = req.body;
        if (!company || !position || !start_date) {
            return res.status(400).json({ status: 'error', message: 'company, position, start_date are required' });
        }
        const [result] = await db.query(
            'INSERT INTO profile_experience (user_id, company, position, description, start_date, end_date, is_current, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [req.user.id, company, position, description || null, start_date, end_date || null, is_current ? 1 : 0]
        );
        return res.status(201).json({ status: 'success', message: 'Experience added', data: { id: result.insertId } });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── DELETE /api/profile/experience/:id ───────────────────────────────────────
router.delete('/experience/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM profile_experience WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        return res.json({ status: 'success', message: 'Experience removed' });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── POST /api/profile/education ───────────────────────────────────────────────
router.post('/education', authMiddleware, async (req, res) => {
    try {
        const { institution, degree, field_of_study, start_date, end_date } = req.body;
        if (!institution || !degree) {
            return res.status(400).json({ status: 'error', message: 'institution and degree are required' });
        }
        const [result] = await db.query(
            'INSERT INTO profile_education (user_id, institution, degree, field_of_study, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [req.user.id, institution, degree, field_of_study || null, start_date || null, end_date || null]
        );
        return res.status(201).json({ status: 'success', message: 'Education added', data: { id: result.insertId } });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── DELETE /api/profile/education/:id ────────────────────────────────────────
router.delete('/education/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM profile_education WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        return res.json({ status: 'success', message: 'Education removed' });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

module.exports = router;
