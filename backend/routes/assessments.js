const express = require('express');
const db      = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

// ── GET /api/assessments ───────────────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
    try {
        const [assessments] = await db.query('SELECT id, category, title, description, time_limit_minutes, passing_score, created_at FROM assessments ORDER BY id ASC');

        let attemptsMap = {};
        if (req.user) {
            const [attempts] = await db.query(`
                SELECT assessment_id, score, passed, proficiency_level, badge_name, created_at
                FROM assessment_attempts
                WHERE user_id = ?
                ORDER BY id DESC
            `, [req.user.id]);

            attempts.forEach(a => {
                if (!attemptsMap[a.assessment_id]) {
                    attemptsMap[a.assessment_id] = a;
                }
            });
        }

        const data = assessments.map(a => ({
            ...a,
            user_attempt: attemptsMap[a.id] || null
        }));

        return success(res, data, 'Skill assessments retrieved');
    } catch (err) {
        console.error('List assessments error:', err);
        return error(res, 'Failed to list assessments', 500);
    }
});

// ── GET /api/assessments/:id ───────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM assessments WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return error(res, 'Assessment not found', 404);

        const assessment = rows[0];
        const rawQuestions = typeof assessment.questions === 'string' ? JSON.parse(assessment.questions) : assessment.questions;

        // Strip correct answer field when serving questions to candidate for security
        const sanitizedQuestions = rawQuestions.map(q => ({
            id: q.id,
            question: q.question,
            options: q.options
        }));

        return success(res, {
            id: assessment.id,
            category: assessment.category,
            title: assessment.title,
            description: assessment.description,
            time_limit_minutes: assessment.time_limit_minutes,
            passing_score: assessment.passing_score,
            total_questions: sanitizedQuestions.length,
            questions: sanitizedQuestions
        }, 'Assessment details loaded');
    } catch (err) {
        console.error('Get assessment error:', err);
        return error(res, 'Failed to load assessment', 500);
    }
});

// ── POST /api/assessments/:id/submit ───────────────────────────────────────────
router.post('/:id/submit', authMiddleware, async (req, res) => {
    try {
        const assessmentId = parseInt(req.params.id, 10);
        const userAnswers = req.body.answers || {}; // { questionId: selectedIndex }

        const [rows] = await db.query('SELECT * FROM assessments WHERE id = ?', [assessmentId]);
        if (rows.length === 0) return error(res, 'Assessment not found', 404);

        const assessment = rows[0];
        const questions = typeof assessment.questions === 'string' ? JSON.parse(assessment.questions) : assessment.questions;

        let correctCount = 0;
        const total = questions.length;
        const reviewDetails = [];

        questions.forEach(q => {
            const userChoice = userAnswers[q.id];
            const isCorrect = userChoice === q.correct;
            if (isCorrect) correctCount++;

            reviewDetails.push({
                question_id: q.id,
                question: q.question,
                user_choice: userChoice !== undefined ? q.options[userChoice] : 'Not answered',
                correct_choice: q.options[q.correct],
                is_correct: isCorrect,
                explanation: q.explanation || ''
            });
        });

        const scorePercent = Math.round((correctCount / total) * 100);
        const passed = scorePercent >= assessment.passing_score;

        let proficiency = 'Beginner';
        let badgeName = '';
        if (scorePercent >= 90) {
            proficiency = 'Expert';
            badgeName = `Gold ${assessment.title.split(' ')[0]} Master`;
        } else if (scorePercent >= 75) {
            proficiency = 'Advanced';
            badgeName = `Silver ${assessment.title.split(' ')[0]} Practitioner`;
        } else if (scorePercent >= 60) {
            proficiency = 'Intermediate';
            badgeName = `Bronze ${assessment.title.split(' ')[0]} Certified`;
        }

        // Save attempt
        const [ins] = await db.query(`
            INSERT INTO assessment_attempts
                (user_id, assessment_id, score, total_questions, correct_answers, proficiency_level, badge_name, passed, answers_summary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.user.id, assessmentId, scorePercent, total, correctCount, proficiency, badgeName, passed ? 1 : 0, JSON.stringify(reviewDetails)]);

        // If passed, auto add or upgrade skill in profile_skills
        if (passed) {
            const skillName = assessment.title.split('&')[0].trim().split(' ')[0];
            const [hasSkill] = await db.query('SELECT id FROM profile_skills WHERE user_id = ? AND skill_name = ?', [req.user.id, skillName]);
            if (hasSkill.length === 0) {
                await db.query('INSERT INTO profile_skills (user_id, skill_name, proficiency_level) VALUES (?, ?, ?)', [req.user.id, skillName, proficiency.toLowerCase()]);
            } else {
                await db.query('UPDATE profile_skills SET proficiency_level = ? WHERE id = ?', [proficiency.toLowerCase(), hasSkill[0].id]);
            }

            // Record timeline event
            await db.query(`
                INSERT INTO career_events (user_id, event_type, title, description, metadata)
                VALUES (?, 'assessment_passed', ?, ?, ?)
            `, [
                req.user.id,
                `Passed ${assessment.title}`,
                `Scored ${scorePercent}% and achieved ${proficiency} proficiency level.`,
                JSON.stringify({ score: scorePercent, proficiency, badge: badgeName })
            ]);
        }

        return success(res, {
            attempt_id: ins.insertId,
            score: scorePercent,
            total_questions: total,
            correct_answers: correctCount,
            passed,
            proficiency_level: proficiency,
            badge_name: badgeName,
            review: reviewDetails
        }, 'Assessment graded and recorded');
    } catch (err) {
        console.error('Submit assessment error:', err);
        return error(res, 'Failed to grade assessment', 500);
    }
});

// ── GET /api/assessments/my/attempts ───────────────────────────────────────────
router.get('/my/attempts', authMiddleware, async (req, res) => {
    try {
        const [attempts] = await db.query(`
            SELECT a.id as attempt_id, a.score, a.passed, a.proficiency_level, a.badge_name, a.created_at,
                   s.title as assessment_title, s.category
            FROM assessment_attempts a
            JOIN assessments s ON a.assessment_id = s.id
            WHERE a.user_id = ?
            ORDER BY a.created_at DESC
        `, [req.user.id]);

        return success(res, attempts, 'My assessment attempts retrieved');
    } catch (err) {
        console.error('My attempts error:', err);
        return error(res, 'Failed to fetch assessment history', 500);
    }
});

module.exports = router;
