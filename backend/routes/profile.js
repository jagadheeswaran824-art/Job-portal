const os       = require('os');
const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const db       = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

// Ensure resume upload directory exists (with /tmp fallback for serverless)
let resumeDir = path.join(__dirname, '../storage/resumes');
try {
    if (!fs.existsSync(resumeDir)) {
        fs.mkdirSync(resumeDir, { recursive: true });
    }
} catch (e) {
    resumeDir = path.join(os.tmpdir(), 'resumes');
    try {
        if (!fs.existsSync(resumeDir)) {
            fs.mkdirSync(resumeDir, { recursive: true });
        }
    } catch (_) {}
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, resumeDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `resume-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const uploadResume = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, DOCX, or TXT files are accepted'));
        }
    }
});

// ── GET /api/profile  (Own profile) ───────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, full_name, email, role, phone, avatar, status, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) return error(res, 'User not found', 404, 'NOT_FOUND');

        const user = rows[0];

        const [profile]    = await db.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
        const [skills]     = await db.query('SELECT * FROM profile_skills WHERE user_id = ? ORDER BY id ASC', [req.user.id]);
        const [experience] = await db.query('SELECT * FROM profile_experience WHERE user_id = ? ORDER BY start_date DESC', [req.user.id]);
        const [education]  = await db.query('SELECT * FROM profile_education WHERE user_id = ? ORDER BY start_date DESC', [req.user.id]);

        return success(res, {
            ...user,
            profile:    profile[0]  || {},
            skills,
            experience,
            education,
        }, 'Profile retrieved');
    } catch (err) {
        console.error('Profile fetch error:', err);
        return error(res, 'Server error fetching profile', 500);
    }
});

// ── PUT /api/profile  (Update basic info & profile) ───────────────────────────
router.put('/', authMiddleware, async (req, res) => {
    try {
        const { full_name, phone } = req.body;
        const updates = [];
        const values  = [];

        if (full_name) { updates.push('full_name = ?'); values.push(full_name.trim()); }
        if (phone)     { updates.push('phone = ?');     values.push(phone.trim()); }

        if (updates.length > 0) {
            values.push(req.user.id);
            await db.query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
        }

        // Upsert profile details
        const profileFields = ['bio', 'headline', 'location', 'website', 'linkedin', 'github', 'experience_years', 'expected_salary'];
        const profileData   = {};
        profileFields.forEach(f => {
            if (req.body[f] !== undefined) profileData[f] = req.body[f];
        });

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

        return success(res, {}, 'Profile updated successfully');
    } catch (err) {
        console.error('Profile update error:', err);
        return error(res, 'Server error updating profile', 500);
    }
});

// ── POST /api/profile/resume  (Upload resume) ─────────────────────────────────
router.post('/resume', authMiddleware, (req, res) => {
    uploadResume.single('resume')(req, res, async (err) => {
        if (err) return error(res, err.message || 'File upload error', 400, 'UPLOAD_ERROR');
        if (!req.file) return error(res, 'No resume file uploaded', 400, 'NO_FILE');

        const resumeUrl = `/uploads/resumes/${req.file.filename}`;
        try {
            await db.query(
                `INSERT INTO profiles (user_id, resume_path, created_at)
                 VALUES (?, ?, NOW())
                 ON DUPLICATE KEY UPDATE resume_path = VALUES(resume_path), updated_at = NOW()`,
                [req.user.id, resumeUrl]
            );
            return success(res, { resume_path: resumeUrl }, 'Resume uploaded successfully');
        } catch (dbErr) {
            return error(res, 'Failed to save resume path', 500);
        }
    });
});

// ── POST /api/profile/skills ──────────────────────────────────────────────────
router.post('/skills', authMiddleware, async (req, res) => {
    try {
        const { skill_name, proficiency_level = 'intermediate' } = req.body;
        if (!skill_name || !skill_name.trim()) {
            return error(res, 'skill_name is required', 400, 'VALIDATION_ERROR');
        }

        const [result] = await db.query(
            'INSERT INTO profile_skills (user_id, skill_name, proficiency_level, created_at) VALUES (?, ?, ?, NOW())',
            [req.user.id, skill_name.trim(), proficiency_level]
        );
        return success(res, { id: result.insertId, skill_name: skill_name.trim(), proficiency_level }, 'Skill added', 201);
    } catch (err) {
        return error(res, 'Server error adding skill', 500);
    }
});

// ── DELETE /api/profile/skills/:id ───────────────────────────────────────────
router.delete('/skills/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM profile_skills WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        return success(res, {}, 'Skill removed');
    } catch (err) {
        return error(res, 'Server error removing skill', 500);
    }
});

// ── POST /api/profile/experience ──────────────────────────────────────────────
router.post('/experience', authMiddleware, async (req, res) => {
    try {
        const { company, position, description, start_date, end_date, is_current = false } = req.body;
        if (!company || !position || !start_date) {
            return error(res, 'Company, position, and start_date are required', 400, 'VALIDATION_ERROR');
        }

        const [result] = await db.query(
            `INSERT INTO profile_experience (user_id, company, position, description, start_date, end_date, is_current, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [req.user.id, company.trim(), position.trim(), description || null, start_date, end_date || null, is_current ? 1 : 0]
        );
        return success(res, { id: result.insertId }, 'Experience entry added', 201);
    } catch (err) {
        return error(res, 'Server error adding experience', 500);
    }
});

// ── DELETE /api/profile/experience/:id ───────────────────────────────────────
router.delete('/experience/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM profile_experience WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        return success(res, {}, 'Experience entry removed');
    } catch (err) {
        return error(res, 'Server error removing experience', 500);
    }
});

// ── POST /api/profile/education ───────────────────────────────────────────────
router.post('/education', authMiddleware, async (req, res) => {
    try {
        const { institution, degree, field_of_study, start_date, end_date } = req.body;
        if (!institution || !degree) {
            return error(res, 'Institution and degree are required', 400, 'VALIDATION_ERROR');
        }

        const [result] = await db.query(
            `INSERT INTO profile_education (user_id, institution, degree, field_of_study, start_date, end_date, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [req.user.id, institution.trim(), degree.trim(), field_of_study || null, start_date || null, end_date || null]
        );
        return success(res, { id: result.insertId }, 'Education entry added', 201);
    } catch (err) {
        return error(res, 'Server error adding education', 500);
    }
});

// ── DELETE /api/profile/education/:id ────────────────────────────────────────
router.delete('/education/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM profile_education WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        return success(res, {}, 'Education entry removed');
    } catch (err) {
        return error(res, 'Server error removing education', 500);
    }
});

module.exports = router;
