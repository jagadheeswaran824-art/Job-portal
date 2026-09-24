const express = require('express');
const db      = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { success, error } = require('../utils/response');

const router = express.Router();

// ── GET /api/career/goal ───────────────────────────────────────────────────────
router.get('/goal', authMiddleware, async (req, res) => {
    try {
        const [goals] = await db.query('SELECT * FROM career_goals WHERE user_id = ? ORDER BY id DESC LIMIT 1', [req.user.id]);
        return success(res, goals[0] || null, 'Career goal retrieved');
    } catch (err) {
        console.error('Get career goal error:', err);
        return error(res, 'Failed to fetch career goal', 500);
    }
});

// ── POST /api/career/goal ──────────────────────────────────────────────────────
router.post('/goal', authMiddleware, async (req, res) => {
    try {
        const { target_role, target_industry, target_salary, current_level, target_date, notes } = req.body;
        if (!target_role) return error(res, 'target_role is required', 400, 'VALIDATION_ERROR');

        const [existing] = await db.query('SELECT id FROM career_goals WHERE user_id = ?', [req.user.id]);
        if (existing.length > 0) {
            await db.query(`
                UPDATE career_goals
                SET target_role = ?, target_industry = ?, target_salary = ?, current_level = ?, target_date = ?, notes = ?, updated_at = NOW()
                WHERE user_id = ?
            `, [target_role, target_industry || 'Technology', target_salary || null, current_level || 'Entry / Fresher', target_date || null, notes || '', req.user.id]);
        } else {
            await db.query(`
                INSERT INTO career_goals (user_id, target_role, target_industry, target_salary, current_level, target_date, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [req.user.id, target_role, target_industry || 'Technology', target_salary || null, current_level || 'Entry / Fresher', target_date || null, notes || '']);
        }

        // Record career event
        await db.query(`
            INSERT INTO career_events (user_id, event_type, title, description, metadata)
            VALUES (?, 'goal_updated', 'Career Goal Set', ?, ?)
        `, [req.user.id, `Targeted role set to ${target_role}`, JSON.stringify({ target_role, target_salary })]);

        return success(res, { target_role, target_industry, current_level }, 'Career goal updated successfully');
    } catch (err) {
        console.error('Save career goal error:', err);
        return error(res, 'Failed to save career goal', 500);
    }
});

// ── POST /api/career/skill-gap ─────────────────────────────────────────────────
router.post('/skill-gap', optionalAuth, async (req, res) => {
    try {
        let skills = req.body.skills || [];
        let targetRole = req.body.target_role;

        if (req.user) {
            const [userSkills] = await db.query('SELECT skill_name FROM profile_skills WHERE user_id = ?', [req.user.id]);
            if (userSkills.length > 0 && skills.length === 0) {
                skills = userSkills.map(s => s.skill_name);
            }
            if (!targetRole) {
                const [goals] = await db.query('SELECT target_role FROM career_goals WHERE user_id = ? LIMIT 1', [req.user.id]);
                if (goals.length > 0) targetRole = goals[0].target_role;
            }
        }

        targetRole = targetRole || 'Full Stack Developer';
        const gapAnalysis = await aiService.analyzeSkillGap(skills, targetRole);
        return success(res, gapAnalysis, 'Skill gap analysis complete');
    } catch (err) {
        console.error('Skill gap error:', err);
        return error(res, 'Failed to analyze skill gap', 500);
    }
});

// ── GET /api/career/roadmap ────────────────────────────────────────────────────
router.get('/roadmap', authMiddleware, async (req, res) => {
    try {
        const [roadmaps] = await db.query('SELECT * FROM career_roadmaps WHERE user_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1', [req.user.id]);
        if (roadmaps.length > 0) {
            const r = roadmaps[0];
            return success(res, {
                ...r,
                stages: typeof r.stages === 'string' ? JSON.parse(r.stages) : r.stages
            }, 'Career roadmap retrieved');
        }

        // Auto generate if not created yet
        const [goals] = await db.query('SELECT target_role, current_level FROM career_goals WHERE user_id = ? LIMIT 1', [req.user.id]);
        const targetRole = goals[0]?.target_role || 'Full Stack Developer';
        const currentLevel = goals[0]?.current_level || 'Entry / Fresher';

        const gps = await aiService.generateCareerGPS(targetRole, currentLevel);
        const [ins] = await db.query(`
            INSERT INTO career_roadmaps (user_id, title, target_role, stages, current_stage_index, completion_percentage, is_active)
            VALUES (?, ?, ?, ?, 0, 15, 1)
        `, [req.user.id, gps.title, targetRole, JSON.stringify(gps.stages)]);

        return success(res, {
            id: ins.insertId,
            user_id: req.user.id,
            title: gps.title,
            target_role: targetRole,
            stages: gps.stages,
            current_stage_index: 0,
            completion_percentage: 15
        }, 'Career GPS generated');
    } catch (err) {
        console.error('Get roadmap error:', err);
        return error(res, 'Failed to load career roadmap', 500);
    }
});

// ── POST /api/career/roadmap/generate ──────────────────────────────────────────
router.post('/roadmap/generate', authMiddleware, async (req, res) => {
    try {
        const targetRole = req.body.target_role || 'Full Stack Developer';
        const currentLevel = req.body.current_level || 'Entry / Fresher';

        const gps = await aiService.generateCareerGPS(targetRole, currentLevel);

        // Deactivate old active roadmaps
        await db.query('UPDATE career_roadmaps SET is_active = 0 WHERE user_id = ?', [req.user.id]);

        const [ins] = await db.query(`
            INSERT INTO career_roadmaps (user_id, title, target_role, stages, current_stage_index, completion_percentage, is_active)
            VALUES (?, ?, ?, ?, 0, 15, 1)
        `, [req.user.id, gps.title, targetRole, JSON.stringify(gps.stages)]);

        // Log timeline event
        await db.query(`
            INSERT INTO career_events (user_id, event_type, title, description, metadata)
            VALUES (?, 'roadmap_generated', 'Career GPS Generated', ?, ?)
        `, [req.user.id, `Created career roadmap for ${targetRole}`, JSON.stringify({ target_role: targetRole })]);

        return success(res, {
            id: ins.insertId,
            user_id: req.user.id,
            title: gps.title,
            target_role: targetRole,
            stages: gps.stages,
            current_stage_index: 0,
            completion_percentage: 15
        }, 'New Career GPS roadmap generated');
    } catch (err) {
        console.error('Generate roadmap error:', err);
        return error(res, 'Failed to generate career roadmap', 500);
    }
});

// ── PATCH /api/career/roadmap/stage ────────────────────────────────────────────
router.patch('/roadmap/stage', authMiddleware, async (req, res) => {
    try {
        const { roadmap_id, stage_index, completed } = req.body;
        const [rows] = await db.query('SELECT * FROM career_roadmaps WHERE id = ? AND user_id = ?', [roadmap_id, req.user.id]);
        if (rows.length === 0) return error(res, 'Roadmap not found', 404);

        const r = rows[0];
        const stages = typeof r.stages === 'string' ? JSON.parse(r.stages) : r.stages;
        if (stages[stage_index]) {
            stages[stage_index].completed = !!completed;
        }

        const completedCount = stages.filter(s => s.completed).length;
        const percentage = Math.round((completedCount / stages.length) * 100);

        await db.query(`
            UPDATE career_roadmaps
            SET stages = ?, completion_percentage = ?, current_stage_index = ?, updated_at = NOW()
            WHERE id = ?
        `, [JSON.stringify(stages), percentage, Math.min(stage_index + (completed ? 1 : 0), stages.length - 1), roadmap_id]);

        return success(res, { stages, completion_percentage: percentage }, 'Roadmap stage updated');
    } catch (err) {
        console.error('Update roadmap stage error:', err);
        return error(res, 'Failed to update stage status', 500);
    }
});

// ── GET /api/career/readiness ──────────────────────────────────────────────────
router.get('/readiness', authMiddleware, async (req, res) => {
    try {
        const [profiles]    = await db.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
        const [skills]      = await db.query('SELECT skill_name FROM profile_skills WHERE user_id = ?', [req.user.id]);
        const [assessments] = await db.query('SELECT score, passed, proficiency_level FROM assessment_attempts WHERE user_id = ?', [req.user.id]);
        const [projects]    = await db.query('SELECT id, title FROM portfolio_projects WHERE user_id = ?', [req.user.id]);

        const profileData = {
            ...(profiles[0] || {}),
            skills: skills.map(s => s.skill_name)
        };

        const readiness = await aiService.calculateJobReadiness(profileData, assessments, projects);
        return success(res, readiness, 'Job readiness score evaluated');
    } catch (err) {
        console.error('Job readiness error:', err);
        return error(res, 'Failed to evaluate readiness score', 500);
    }
});

// ── GET /api/career/timeline ───────────────────────────────────────────────────
router.get('/timeline', authMiddleware, async (req, res) => {
    try {
        const [events] = await db.query(`
            SELECT * FROM career_events
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        `, [req.user.id]);

        // If no events logged yet, return initialized welcome events
        if (events.length === 0) {
            const defaultEvents = [
                { id: 1, event_type: 'account_created', title: 'Account Created', description: 'Joined JobPortal Career Platform', created_at: new Date().toISOString() },
                { id: 2, event_type: 'profile_ready', title: 'Profile Initialized', description: 'Profile ready for skill matching and applications', created_at: new Date().toISOString() }
            ];
            return success(res, defaultEvents, 'Career timeline retrieved');
        }

        return success(res, events, 'Career timeline retrieved');
    } catch (err) {
        console.error('Timeline error:', err);
        return error(res, 'Failed to retrieve timeline', 500);
    }
});

// ── POST /api/career/events ────────────────────────────────────────────────────
router.post('/events', authMiddleware, async (req, res) => {
    try {
        const { event_type, title, description, metadata } = req.body;
        if (!title) return error(res, 'title is required', 400);

        const [ins] = await db.query(`
            INSERT INTO career_events (user_id, event_type, title, description, metadata)
            VALUES (?, ?, ?, ?, ?)
        `, [req.user.id, event_type || 'milestone', title, description || '', JSON.stringify(metadata || {})]);

        return success(res, { id: ins.insertId, title }, 'Career event recorded', 201);
    } catch (err) {
        console.error('Record event error:', err);
        return error(res, 'Failed to record event', 500);
    }
});

module.exports = router;
