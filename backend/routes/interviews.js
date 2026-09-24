const express = require('express');
const db      = require('../db');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { success, error } = require('../utils/response');

const router = express.Router();

const SIMULATION_QUESTIONS = {
    'Frontend Developer': [
        'How does the browser event loop handle microtasks vs macrotasks when rendering React components?',
        'What strategies do you employ to optimize Core Web Vitals (LCP, FID, CLS) on high-traffic web applications?',
        'Describe how you handle state management across deeply nested components without causing unnecessary re-renders.'
    ],
    'Backend Engineer': [
        'How do you design a database indexing strategy to optimize high-throughput multi-column search queries?',
        'Explain how you would handle connection pooling, caching (Redis), and failover in a microservices API.',
        'Describe an instance where you identified and resolved an API bottleneck or memory leak in production.'
    ],
    'Full Stack Developer': [
        'Walk through how you secure an end-to-end user authentication flow using JWT tokens, HTTP-only cookies, and refresh tokens.',
        'How do you balance server-side rendering (SSR) versus client-side rendering (CSR) for SEO and performance?',
        'Describe your strategy for writing unit, integration, and end-to-end tests across full-stack applications.'
    ],
    'Python & AI Developer': [
        'How do you optimize data preprocessing pipelines using NumPy and Pandas to prevent memory overflow on large datasets?',
        'Explain the trade-offs between deploying an LLM via cloud API versus hosting an open-source model with FastAPI and Docker.',
        'What metrics and validation methods do you use to detect and mitigate model overfitting or hallucination?'
    ]
};

// ── POST /api/interviews/simulate/start ─────────────────────────────────────────
router.post('/simulate/start', authMiddleware, async (req, res) => {
    try {
        const { role_title = 'Full Stack Developer', difficulty = 'mid', interview_type = 'Technical' } = req.body;
        const roleQuestions = SIMULATION_QUESTIONS[role_title] || SIMULATION_QUESTIONS['Full Stack Developer'];

        const session = {
            role_title,
            difficulty,
            interview_type,
            total_questions: roleQuestions.length,
            current_question_index: 0,
            question: roleQuestions[0],
            transcript: []
        };

        return success(res, session, 'Interview simulation session started');
    } catch (err) {
        console.error('Start simulation error:', err);
        return error(res, 'Failed to start simulation', 500);
    }
});

// ── POST /api/interviews/simulate/answer ────────────────────────────────────────
router.post('/simulate/answer', authMiddleware, async (req, res) => {
    try {
        const { role_title = 'Full Stack Developer', question, answer, question_index = 0, interview_type = 'Technical' } = req.body;
        if (!answer) return error(res, 'Candidate answer is required', 400);

        const evaluation = await aiService.evaluateInterviewAnswer(role_title, question, answer, interview_type);
        const roleQuestions = SIMULATION_QUESTIONS[role_title] || SIMULATION_QUESTIONS['Full Stack Developer'];
        const nextIndex = question_index + 1;
        const nextQuestion = nextIndex < roleQuestions.length ? roleQuestions[nextIndex] : null;
        const isComplete = !nextQuestion;

        if (isComplete) {
            // Save completed simulation in DB
            await db.query(`
                INSERT INTO interview_simulations
                    (user_id, role_title, difficulty, interview_type, overall_score, evaluation_summary, transcript)
                VALUES (?, ?, 'mid', ?, ?, ?, ?)
            `, [
                req.user.id,
                role_title,
                interview_type,
                evaluation.overall_score,
                JSON.stringify(evaluation),
                JSON.stringify([{ question, answer, evaluation }])
            ]);

            // Log career event
            await db.query(`
                INSERT INTO career_events (user_id, event_type, title, description, metadata)
                VALUES (?, 'mock_interview_completed', 'Completed AI Mock Interview', ?, ?)
            `, [
                req.user.id,
                `Practiced ${role_title} mock interview with ${evaluation.overall_score}% performance score.`,
                JSON.stringify({ role: role_title, score: evaluation.overall_score })
            ]);
        }

        return success(res, {
            evaluation,
            next_question_index: nextIndex,
            next_question: nextQuestion,
            is_complete: isComplete
        }, 'Answer evaluated successfully');
    } catch (err) {
        console.error('Evaluate answer error:', err);
        return error(res, 'Failed to evaluate interview answer', 500);
    }
});

// ── POST /api/interviews/schedule (Recruiter) ───────────────────────────────────
router.post('/schedule', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'employer' && req.user.role !== 'admin') {
            return error(res, 'Only employers and admins can schedule interviews', 403);
        }

        const { application_id, candidate_id, job_id, interview_date, interview_time, interview_type = 'video', meeting_link, notes } = req.body;
        if (!candidate_id || !job_id || !interview_date || !interview_time) {
            return error(res, 'candidate_id, job_id, interview_date, and interview_time are required', 400);
        }

        // Collision Check: Verify employer or candidate doesn't already have an interview at this exact slot
        const [conflicts] = await db.query(`
            SELECT id FROM scheduled_interviews
            WHERE (employer_id = ? OR candidate_id = ?) AND interview_date = ? AND interview_time = ? AND status = 'scheduled'
        `, [req.user.id, candidate_id, interview_date, interview_time]);

        if (conflicts.length > 0) {
            return error(res, 'Scheduling conflict: Either you or the candidate already have an interview at this exact date & time.', 409, 'CONFLICT');
        }

        const [ins] = await db.query(`
            INSERT INTO scheduled_interviews
                (application_id, employer_id, candidate_id, job_id, interview_date, interview_time, interview_type, meeting_link, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
        `, [application_id || null, req.user.id, candidate_id, job_id, interview_date, interview_time, interview_type, meeting_link || 'https://meet.google.com/new', notes || '']);

        // Update application status to 'interview' if application_id is provided
        if (application_id) {
            await db.query("UPDATE applications SET status = 'interview' WHERE id = ?", [application_id]);
        }

        // Send notification to candidate
        const [jobRows] = await db.query('SELECT title, company_name FROM jobs WHERE id = ?', [job_id]);
        const jobTitle = jobRows[0]?.title || 'Open Role';
        const compName = jobRows[0]?.company_name || 'Employer';

        await db.query(`
            INSERT INTO notifications (user_id, type, title, message, data)
            VALUES (?, 'interview_scheduled', 'Interview Scheduled! 📅', ?, ?)
        `, [
            candidate_id,
            `You have an interview scheduled for ${jobTitle} with ${compName} on ${interview_date} at ${interview_time}.`,
            JSON.stringify({ interview_id: ins.insertId, job_id, meeting_link })
        ]);

        // Record career event for candidate
        await db.query(`
            INSERT INTO career_events (user_id, event_type, title, description, metadata)
            VALUES (?, 'interview_scheduled', ?, ?, ?)
        `, [
            candidate_id,
            `Interview with ${compName}`,
            `Scheduled for ${jobTitle} on ${interview_date} at ${interview_time}.`,
            JSON.stringify({ interview_id: ins.insertId, company: compName, date: interview_date })
        ]);

        return success(res, { id: ins.insertId, status: 'scheduled' }, 'Interview successfully scheduled', 201);
    } catch (err) {
        console.error('Schedule interview error:', err);
        return error(res, 'Failed to schedule interview', 500);
    }
});

// ── GET /api/interviews/my ─────────────────────────────────────────────────────
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const isEmployer = req.user.role === 'employer' || req.user.role === 'admin';
        const query = isEmployer
            ? `SELECT i.*, j.title as job_title, j.company_name, u.full_name as candidate_name, u.email as candidate_email, u.phone as candidate_phone
               FROM scheduled_interviews i
               JOIN jobs j ON i.job_id = j.id
               JOIN users u ON i.candidate_id = u.id
               WHERE i.employer_id = ?
               ORDER BY i.interview_date ASC, i.interview_time ASC`
            : `SELECT i.*, j.title as job_title, j.company_name, j.location as job_location, u.full_name as employer_name, u.email as employer_email
               FROM scheduled_interviews i
               JOIN jobs j ON i.job_id = j.id
               JOIN users u ON i.employer_id = u.id
               WHERE i.candidate_id = ?
               ORDER BY i.interview_date ASC, i.interview_time ASC`;

        const [interviews] = await db.query(query, [req.user.id]);
        return success(res, interviews, 'Scheduled interviews retrieved');
    } catch (err) {
        console.error('Get my interviews error:', err);
        return error(res, 'Failed to fetch interviews', 500);
    }
});

// ── PATCH /api/interviews/:id/status ───────────────────────────────────────────
router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status, feedback } = req.body;
        const [rows] = await db.query('SELECT * FROM scheduled_interviews WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return error(res, 'Interview not found', 404);

        const intRow = rows[0];
        if (intRow.employer_id !== req.user.id && intRow.candidate_id !== req.user.id && req.user.role !== 'admin') {
            return error(res, 'Unauthorized to update this interview', 403);
        }

        await db.query(`
            UPDATE scheduled_interviews
            SET status = ?, feedback = COALESCE(?, feedback), updated_at = NOW()
            WHERE id = ?
        `, [status || intRow.status, feedback || null, req.params.id]);

        return success(res, { id: req.params.id, status }, 'Interview status updated');
    } catch (err) {
        console.error('Update interview status error:', err);
        return error(res, 'Failed to update interview', 500);
    }
});

module.exports = router;
