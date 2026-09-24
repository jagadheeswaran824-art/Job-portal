const os       = require('os');
const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const db       = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { requireRole }    = require('../middleware/role');
const { success, error } = require('../utils/response');

const router = express.Router();

// Ensure storage directory exists (with /tmp fallback for serverless)
let uploadDir = path.join(__dirname, '../storage/avatars');
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (e) {
    uploadDir = path.join(os.tmpdir(), 'avatars');
    try {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
    } catch (_) {}
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
    fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (.png, .jpg, .jpeg, .webp) are allowed'));
        }
    }
});

// ── GET /api/users  (Admin only) ──────────────────────────────────────────────
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const page    = Math.max(1, parseInt(req.query.page)     || 1);
        const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page) || 20));
        const offset  = (page - 1) * perPage;
        const search  = req.query.search ? `%${req.query.search}%` : null;
        const role    = req.query.role || null;

        let where  = ['1=1'];
        let params = [];

        if (search) {
            where.push('(full_name LIKE ? OR email LIKE ?)');
            params.push(search, search);
        }
        if (role) {
            where.push('role = ?');
            params.push(role);
        }

        const whereSql = 'WHERE ' + where.join(' AND ');

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users ${whereSql}`, params);
        const [users] = await db.query(
            `SELECT id, full_name, email, role, phone, avatar, status, created_at
             FROM users ${whereSql}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, perPage, offset]
        );

        return success(res, users, 'Users retrieved', 200, {
            total,
            per_page: perPage,
            current_page: page,
            total_pages: Math.ceil(total / perPage),
        });
    } catch (err) {
        console.error('List users error:', err);
        return error(res, 'Server error fetching users', 500);
    }
});

// ── GET /api/users/profile/:id  (Public candidate/recruiter profile) ───────────
router.get('/profile/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (!userId) return error(res, 'Invalid user ID', 400, 'INVALID_ID');

        const [users] = await db.query(
            'SELECT id, full_name, role, avatar, created_at FROM users WHERE id = ? AND status = "active"',
            [userId]
        );
        if (users.length === 0) return error(res, 'User not found', 404, 'NOT_FOUND');

        const user = users[0];
        const [profiles]   = await db.query('SELECT headline, bio, location, website, linkedin, github, experience_years FROM profiles WHERE user_id = ?', [userId]);
        const [skills]     = await db.query('SELECT skill_name, proficiency_level FROM profile_skills WHERE user_id = ?', [userId]);
        const [experience] = await db.query('SELECT company, position, description, start_date, end_date, is_current FROM profile_experience WHERE user_id = ? ORDER BY start_date DESC', [userId]);
        const [education]  = await db.query('SELECT institution, degree, field_of_study, start_date, end_date FROM profile_education WHERE user_id = ? ORDER BY start_date DESC', [userId]);

        return success(res, {
            ...user,
            profile: profiles[0] || {},
            skills,
            experience,
            education,
        }, 'User profile retrieved');
    } catch (err) {
        return error(res, 'Server error fetching user profile', 500);
    }
});

// ── POST /api/users/avatar  (Upload avatar) ───────────────────────────────────
router.post('/avatar', authMiddleware, (req, res) => {
    upload.single('avatar')(req, res, async (err) => {
        if (err) {
            return error(res, err.message || 'Avatar upload failed', 400, 'UPLOAD_ERROR');
        }
        if (!req.file) {
            return error(res, 'No image file uploaded', 400, 'NO_FILE');
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        try {
            await db.query('UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?', [avatarUrl, req.user.id]);
            return success(res, { avatar: avatarUrl }, 'Avatar updated successfully');
        } catch (dbErr) {
            return error(res, 'Failed to save avatar to database', 500);
        }
    });
});

module.exports = router;
