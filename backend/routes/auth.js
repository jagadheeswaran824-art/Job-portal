const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const router   = express.Router();

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { full_name, email, password, role = 'job_seeker' } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ status: 'error', message: 'All fields are required' });
        }

        // Check duplicate email
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ status: 'error', message: 'Email already registered' });
        }

        const hashed = await bcrypt.hash(password, 12);

        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, "active", NOW())',
            [full_name, email, hashed, role]
        );

        const token = jwt.sign(
            { id: result.insertId, email, role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            status: 'success',
            message: 'Registration successful',
            data: { id: result.insertId, full_name, email, role, token }
        });

    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ status: 'error', message: 'Email and password are required' });
        }

        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
        }

        const user = rows[0];

        if (user.status === 'banned') {
            return res.status(403).json({ status: 'error', message: 'Account is banned' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const { password: _pw, ...safeUser } = user;

        return res.json({
            status: 'success',
            message: 'Login successful',
            data: { user: safeUser, token }
        });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const authMiddleware = require('../middleware/auth');

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, full_name, email, role, phone, avatar, status, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }
        return res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', authMiddleware, (req, res) => {
    // JWT is stateless — client just deletes the token
    return res.json({ status: 'success', message: 'Logged out successfully' });
});

module.exports = router;
