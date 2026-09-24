const express = require('express');
const db      = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { success, error } = require('../utils/response');

const router = express.Router();

// ── GET /api/portfolio/projects ────────────────────────────────────────────────
router.get('/projects', authMiddleware, async (req, res) => {
    try {
        const [projects] = await db.query('SELECT * FROM portfolio_projects WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
        const formatted = projects.map(p => ({
            ...p,
            technologies: typeof p.technologies === 'string' ? JSON.parse(p.technologies || '[]') : p.technologies,
            features: typeof p.features === 'string' ? JSON.parse(p.features || '[]') : p.features,
            bullet_points: typeof p.bullet_points === 'string' ? JSON.parse(p.bullet_points || '[]') : p.bullet_points
        }));
        return success(res, formatted, 'Projects retrieved');
    } catch (err) {
        console.error('List projects error:', err);
        return error(res, 'Failed to fetch projects', 500);
    }
});

// ── POST /api/portfolio/projects ───────────────────────────────────────────────
router.post('/projects', authMiddleware, async (req, res) => {
    try {
        const { title, problem, solution, technologies = [], features = [], bullet_points = [], live_url, github_url, role_description } = req.body;
        if (!title) return error(res, 'Project title is required', 400);

        const [ins] = await db.query(`
            INSERT INTO portfolio_projects
                (user_id, title, problem, solution, technologies, features, bullet_points, live_url, github_url, role_description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id,
            title,
            problem || '',
            solution || '',
            JSON.stringify(technologies),
            JSON.stringify(features),
            JSON.stringify(bullet_points),
            live_url || '',
            github_url || '',
            role_description || ''
        ]);

        // Record career event
        await db.query(`
            INSERT INTO career_events (user_id, event_type, title, description, metadata)
            VALUES (?, 'project_added', 'Portfolio Project Added', ?, ?)
        `, [req.user.id, `Published project: ${title}`, JSON.stringify({ project_id: ins.insertId, title })]);

        return success(res, { id: ins.insertId, title }, 'Project saved successfully', 201);
    } catch (err) {
        console.error('Save project error:', err);
        return error(res, 'Failed to save project', 500);
    }
});

// ── DELETE /api/portfolio/projects/:id ─────────────────────────────────────────
router.delete('/projects/:id', authMiddleware, async (req, res) => {
    try {
        const [del] = await db.query('DELETE FROM portfolio_projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (del.affectedRows === 0) return error(res, 'Project not found or unauthorized', 404);
        return success(res, null, 'Project removed');
    } catch (err) {
        console.error('Delete project error:', err);
        return error(res, 'Failed to remove project', 500);
    }
});

// ── POST /api/portfolio/analyze-project (AI Project Analyzer) ───────────────────
router.post('/analyze-project', optionalAuth, async (req, res) => {
    try {
        const { title, summary, technologies = [] } = req.body;
        if (!title) return error(res, 'Project title is required', 400);

        const analysis = await aiService.analyzeProject(title, summary, technologies);
        return success(res, analysis, 'Project analysis complete');
    } catch (err) {
        console.error('Analyze project error:', err);
        return error(res, 'Failed to analyze project', 500);
    }
});

// ── GET /api/portfolio/generate (Portfolio Generator) ──────────────────────────
router.get('/generate', authMiddleware, async (req, res) => {
    try {
        const [users]      = await db.query('SELECT full_name, email, phone FROM users WHERE id = ?', [req.user.id]);
        const [profiles]   = await db.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
        const [skills]     = await db.query('SELECT skill_name, proficiency_level FROM profile_skills WHERE user_id = ?', [req.user.id]);
        const [projects]   = await db.query('SELECT * FROM portfolio_projects WHERE user_id = ?', [req.user.id]);
        const [experience] = await db.query('SELECT * FROM profile_experience WHERE user_id = ?', [req.user.id]);
        const [education]  = await db.query('SELECT * FROM profile_education WHERE user_id = ?', [req.user.id]);

        const userProfile = {
            ...(users[0] || {}),
            ...(profiles[0] || {})
        };

        const portfolioData = await aiService.generatePortfolioData(userProfile, projects, skills, education, experience);
        return success(res, portfolioData, 'Portfolio data generated');
    } catch (err) {
        console.error('Generate portfolio error:', err);
        return error(res, 'Failed to generate portfolio', 500);
    }
});

// ── GET /api/portfolio/view/:userId (Public Portfolio View) ────────────────────
router.get('/view/:userId', async (req, res) => {
    try {
        const targetId = parseInt(req.params.userId, 10);
        const [users]      = await db.query('SELECT id, full_name, email FROM users WHERE id = ?', [targetId]);
        if (users.length === 0) return error(res, 'User not found', 404);

        const [profiles]   = await db.query('SELECT * FROM profiles WHERE user_id = ?', [targetId]);
        const [skills]     = await db.query('SELECT skill_name, proficiency_level FROM profile_skills WHERE user_id = ?', [targetId]);
        const [projects]   = await db.query('SELECT * FROM portfolio_projects WHERE user_id = ?', [targetId]);
        const [experience] = await db.query('SELECT * FROM profile_experience WHERE user_id = ?', [targetId]);
        const [education]  = await db.query('SELECT * FROM profile_education WHERE user_id = ?', [targetId]);

        const userProfile = {
            ...(users[0] || {}),
            ...(profiles[0] || {})
        };

        const portfolioData = await aiService.generatePortfolioData(userProfile, projects, skills, education, experience);
        return success(res, portfolioData, 'Public portfolio data loaded');
    } catch (err) {
        console.error('View public portfolio error:', err);
        return error(res, 'Failed to load portfolio', 500);
    }
});

module.exports = router;
