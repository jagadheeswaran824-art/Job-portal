const express  = require('express');
const db       = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

// ── GET /api/notifications ────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
    try {
        const page    = Math.max(1, parseInt(req.query.page)     || 1);
        const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page) || 20));
        const offset  = (page - 1) * perPage;

        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?',
            [req.user.id]
        );

        const [notifications] = await db.query(
            `SELECT id, type, title, message, data, is_read, read_at, created_at
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [req.user.id, perPage, offset]
        );

        const parsed = notifications.map(n => {
            let data = n.data;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch { data = null; }
            }
            return { ...n, data };
        });

        return success(res, parsed, 'Notifications retrieved', 200, {
            total,
            per_page: perPage,
            current_page: page,
            total_pages: Math.ceil(total / perPage),
        });
    } catch (err) {
        console.error('Fetch notifications error:', err);
        return error(res, 'Server error fetching notifications', 500);
    }
});

// ── GET /api/notifications/unread/count ───────────────────────────────────────
router.get('/unread/count', authMiddleware, async (req, res) => {
    try {
        const [[{ count }]] = await db.query(
            'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );
        return success(res, { unread_count: count }, 'Unread count fetched');
    } catch (err) {
        return error(res, 'Server error fetching unread count', 500);
    }
});

// ── PATCH /api/notifications/:id/read ─────────────────────────────────────────
router.patch('/:id/read', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.query(
            'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        return success(res, {}, 'Notification marked as read');
    } catch (err) {
        return error(res, 'Server error marking notification as read', 500);
    }
});

// ── PATCH /api/notifications/read-all ─────────────────────────────────────────
router.patch('/read-all', authMiddleware, async (req, res) => {
    try {
        await db.query(
            'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );
        return success(res, {}, 'All notifications marked as read');
    } catch (err) {
        return error(res, 'Server error marking notifications as read', 500);
    }
});

// ── DELETE /api/notifications/:id ─────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id]);
        return success(res, {}, 'Notification deleted');
    } catch (err) {
        return error(res, 'Server error deleting notification', 500);
    }
});

// ── DELETE /api/notifications/clear-all ───────────────────────────────────────
router.delete('/clear-all', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM notifications WHERE user_id = ?', [req.user.id]);
        return success(res, {}, 'All notifications cleared');
    } catch (err) {
        return error(res, 'Server error clearing notifications', 500);
    }
});

module.exports = router;
