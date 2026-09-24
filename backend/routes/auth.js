const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter }    = require('../middleware/rateLimit');
const { success, error } = require('../utils/response');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const router = express.Router();

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
    try {
        const { full_name, email, password, role = 'job_seeker' } = req.body;

        if (!full_name || !email || !password) {
            return error(res, 'Name, email, and password are required', 400, 'VALIDATION_ERROR');
        }

        const cleanEmail = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return error(res, 'Invalid email address format', 400, 'INVALID_EMAIL');
        }

        if (password.length < 6) {
            return error(res, 'Password must be at least 6 characters', 400, 'WEAK_PASSWORD');
        }

        const validRole = ['job_seeker', 'employer', 'admin'].includes(role) ? role : 'job_seeker';

        // Check duplicate email
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (existing.length > 0) {
            return error(res, 'An account with this email already exists', 409, 'EMAIL_EXISTS');
        }

        const hashed = await bcrypt.hash(password, 12);

        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, "active", NOW())',
            [full_name.trim(), cleanEmail, hashed, validRole]
        );

        const token = jwt.sign(
            { id: result.insertId, email: cleanEmail, role: validRole },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Create initial blank profile
        try {
            await db.query('INSERT IGNORE INTO profiles (user_id, created_at) VALUES (?, NOW())', [result.insertId]);
        } catch { /* ignore if fails */ }

        return success(
            res,
            {
                user: { id: result.insertId, full_name: full_name.trim(), email: cleanEmail, role: validRole },
                token,
            },
            'Registration successful! Welcome to JobPortal.',
            201
        );

    } catch (err) {
        console.error('Register error:', err);
        return error(res, 'Registration failed due to a server error. Please try again.', 500);
    }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return error(res, 'Email and password are required', 400, 'VALIDATION_ERROR');
        }

        const cleanEmail = email.trim().toLowerCase();
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
        if (rows.length === 0) {
            return error(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        const user = rows[0];

        if (user.status === 'banned') {
            return error(res, 'Your account has been suspended. Please contact support.', 403, 'ACCOUNT_BANNED');
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return error(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const { password: _pw, ...safeUser } = user;

        return success(
            res,
            { user: safeUser, token },
            'Login successful'
        );

    } catch (err) {
        console.error('Login error:', err);
        return error(res, 'Server error during login', 500);
    }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, full_name, email, role, phone, avatar, status, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) {
            return error(res, 'User not found', 404, 'NOT_FOUND');
        }
        return success(res, rows[0], 'Profile fetched');
    } catch (err) {
        return error(res, 'Server error fetching user profile', 500);
    }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        const token = req.token;
        if (token) {
            // Blacklist token in MySQL
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await db.query(
                'INSERT INTO token_blacklist (token, expires_at, created_at) VALUES (?, ?, NOW())',
                [token, expiresAt]
            );
        }
        return success(res, {}, 'Logged out successfully');
    } catch (err) {
        return success(res, {}, 'Logged out successfully');
    }
});

// ── PUT /api/auth/change-password ─────────────────────────────────────────────
router.put('/change-password', authMiddleware, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            return error(res, 'Current password and new password are required', 400, 'VALIDATION_ERROR');
        }
        if (new_password.length < 6) {
            return error(res, 'New password must be at least 6 characters', 400, 'WEAK_PASSWORD');
        }

        const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return error(res, 'User not found', 404);

        const match = await bcrypt.compare(current_password, rows[0].password);
        if (!match) {
            return error(res, 'Current password is incorrect', 401, 'INVALID_PASSWORD');
        }

        const hashed = await bcrypt.hash(new_password, 12);
        await db.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashed, req.user.id]);

        return success(res, {}, 'Password changed successfully');
    } catch (err) {
        return error(res, 'Server error updating password', 500);
    }
});

module.exports = router;
