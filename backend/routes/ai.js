const express  = require('express');
const db       = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { aiLimiter }                    = require('../middleware/rateLimit');
const aiService                        = require('../services/aiService');
const { success, error }               = require('../utils/response');

const router = express.Router();

router.use(aiLimiter);

// ── POST /api/ai/resume-analyzer ──────────────────────────────────────────────
router.post('/resume-analyzer', optionalAuth, async (req, res) => {
    try {
        let resumeText = req.body.resume_text || '';
        let profileData = {};

        if (req.user) {
            const [profiles] = await db.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
            const [skills]   = await db.query('SELECT skill_name FROM profile_skills WHERE user_id = ?', [req.user.id]);
            const [exp]      = await db.query('SELECT * FROM profile_experience WHERE user_id = ?', [req.user.id]);
            const [edu]      = await db.query('SELECT * FROM profile_education WHERE user_id = ?', [req.user.id]);
            profileData = {
                ...(profiles[0] || {}),
                skills: skills.map(s => s.skill_name),
                experience: exp,
                education: edu
            };
        }

        const analysis = await aiService.analyzeResume(resumeText, profileData);

        // Record career event if logged in
        if (req.user) {
            await db.query(`
                INSERT INTO career_events (user_id, event_type, title, description, metadata)
                VALUES (?, 'resume_analyzed', 'AI Resume Analysis', ?, ?)
            `, [
                req.user.id,
                `ATS score evaluated at ${analysis.ats_score}% with ${analysis.extracted_skills.length} extracted skills.`,
                JSON.stringify({ ats_score: analysis.ats_score, skills: analysis.extracted_skills })
            ]);
        }

        return success(res, analysis, 'Resume and profile analysis complete');
    } catch (err) {
        console.error('Resume analyzer error:', err);
        return error(res, 'Failed to complete resume analysis', 500);
    }
});

// ── POST /api/ai/match-score ──────────────────────────────────────────────────
router.post('/match-score', optionalAuth, async (req, res) => {
    try {
        const jobId = parseInt(req.body.job_id, 10);
        if (!jobId) return error(res, 'job_id is required', 400, 'VALIDATION_ERROR');

        const [jobs] = await db.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
        if (jobs.length === 0) return error(res, 'Job listing not found', 404, 'NOT_FOUND');

        let candidateProfile = { skills: req.body.skills || [] };

        if (req.user) {
            const [profiles] = await db.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
            const [skills]   = await db.query('SELECT skill_name FROM profile_skills WHERE user_id = ?', [req.user.id]);
            candidateProfile = {
                profile: profiles[0] || {},
                skills: skills.map(s => s.skill_name),
            };
        }

        const match = await aiService.calculateMatchScore(candidateProfile, jobs[0]);
        return success(res, match, 'Match score calculated');
    } catch (err) {
        console.error('Match score error:', err);
        return error(res, 'Failed to calculate match score', 500);
    }
});

// ── POST /api/ai/cover-letter ─────────────────────────────────────────────────
router.post('/cover-letter', optionalAuth, async (req, res) => {
    try {
        const jobId = parseInt(req.body.job_id, 10);
        if (!jobId) return error(res, 'job_id is required', 400, 'VALIDATION_ERROR');

        const [jobs] = await db.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
        if (jobs.length === 0) return error(res, 'Job listing not found', 404, 'NOT_FOUND');

        let candidate = {
            full_name: req.body.full_name || 'Candidate',
            email: req.body.email || '',
            phone: req.body.phone || '',
            skills: req.body.skills || [],
            profile: { headline: req.body.headline || 'Software Professional' },
        };

        if (req.user) {
            const [users]    = await db.query('SELECT full_name, email, phone FROM users WHERE id = ?', [req.user.id]);
            const [profiles] = await db.query('SELECT headline FROM profiles WHERE user_id = ?', [req.user.id]);
            const [skills]   = await db.query('SELECT skill_name FROM profile_skills WHERE user_id = ?', [req.user.id]);
            candidate = {
                full_name: users[0]?.full_name || candidate.full_name,
                email: users[0]?.email || candidate.email,
                phone: users[0]?.phone || candidate.phone,
                profile: profiles[0] || candidate.profile,
                skills: skills.map(s => s.skill_name),
            };
        }

        const result = await aiService.generateCoverLetter(candidate, jobs[0], req.body.tone || 'professional');
        return success(res, result, 'Cover letter generated successfully');
    } catch (err) {
        console.error('Cover letter generation error:', err);
        return error(res, 'Failed to generate cover letter', 500);
    }
});

// ── POST /api/ai/interview-prep ───────────────────────────────────────────────
router.post('/interview-prep', async (req, res) => {
    try {
        let jobTitle = (req.body.job_title || '').trim();
        let category = (req.body.category || 'general').trim();

        if (req.body.job_id) {
            const [jobs] = await db.query('SELECT title, category FROM jobs WHERE id = ?', [parseInt(req.body.job_id, 10)]);
            if (jobs.length > 0) {
                jobTitle = jobs[0].title;
                category = jobs[0].category || category;
            }
        }

        if (!jobTitle) jobTitle = 'Software Engineer';

        const prep = await aiService.generateInterviewPrep(jobTitle, category);
        return success(res, prep, 'Interview preparation generated');
    } catch (err) {
        console.error('Interview prep error:', err);
        return error(res, 'Failed to generate interview preparation', 500);
    }
});

// ── POST /api/ai/optimize-job (Employers) ─────────────────────────────────────
router.post('/optimize-job', optionalAuth, async (req, res) => {
    try {
        const { title, company_name, description, requirements, skills } = req.body;
        if (!title && !description) {
            return error(res, 'Job title or description is required for optimization', 400, 'VALIDATION_ERROR');
        }

        const optimized = await aiService.optimizeJobDescription({
            title, company_name, description, requirements, skills
        });

        return success(res, optimized, 'Job description optimized');
    } catch (err) {
        console.error('Job optimization error:', err);
        return error(res, 'Failed to optimize job description', 500);
    }
});

// ── GET /api/ai/career-guidance ───────────────────────────────────────────────
router.get('/career-guidance', optionalAuth, async (req, res) => {
    try {
        let candidate = { skills: [], profile: {} };

        if (req.user) {
            const [profiles] = await db.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
            const [skills]   = await db.query('SELECT skill_name FROM profile_skills WHERE user_id = ?', [req.user.id]);
            candidate = {
                profile: profiles[0] || {},
                skills: skills.map(s => s.skill_name),
            };
        }

        const guidance = await aiService.analyzeSkillGap(candidate.skills, candidate.profile?.headline || 'Full Stack Developer');
        return success(res, guidance, 'Career guidance generated');
    } catch (err) {
        console.error('Career guidance error:', err);
        return error(res, 'Failed to generate career guidance', 500);
    }
});

// ── POST /api/ai/chat-assistant (Career AI Chat) ──────────────────────────────
router.post('/chat-assistant', optionalAuth, async (req, res) => {
    try {
        const message = req.body.message || '';
        let userContext = {};

        if (req.user) {
            const [users]    = await db.query('SELECT full_name, email FROM users WHERE id = ?', [req.user.id]);
            const [profiles] = await db.query('SELECT headline, location, bio FROM profiles WHERE user_id = ?', [req.user.id]);
            const [skills]   = await db.query('SELECT skill_name FROM profile_skills WHERE user_id = ?', [req.user.id]);
            userContext = {
                full_name: users[0]?.full_name,
                headline: profiles[0]?.headline,
                location: profiles[0]?.location,
                skills: skills.map(s => s.skill_name)
            };
        }

        const response = await aiService.chatCareerAssistant(message, userContext);
        return success(res, response, 'Assistant response generated');
    } catch (err) {
        console.error('Chat assistant error:', err);
        return error(res, 'Failed to generate assistant response', 500);
    }
});

// ── POST /api/ai/jd-analyzer ───────────────────────────────────────────────────
router.post('/jd-analyzer', async (req, res) => {
    try {
        const text = req.body.job_description || '';
        if (!text) return error(res, 'job_description text is required', 400);

        const analysis = await aiService.analyzeJobDescription(text);
        return success(res, analysis, 'Job description analyzed');
    } catch (err) {
        console.error('JD analyzer error:', err);
        return error(res, 'Failed to analyze job description', 500);
    }
});

// ── POST /api/ai/job-safety ────────────────────────────────────────────────────
router.post('/job-safety', async (req, res) => {
    try {
        let jobData = req.body;
        if (req.body.job_id) {
            const [jobs] = await db.query('SELECT * FROM jobs WHERE id = ?', [parseInt(req.body.job_id, 10)]);
            if (jobs.length > 0) jobData = jobs[0];
        }

        const scan = await aiService.scanJobSafety(jobData);
        return success(res, scan, 'Job safety analysis complete');
    } catch (err) {
        console.error('Job safety scan error:', err);
        return error(res, 'Failed to scan job safety', 500);
    }
});

// ── POST /api/ai/natural-search ───────────────────────────────────────────────
router.post('/natural-search', async (req, res) => {
    try {
        const query = req.body.query || '';
        const parsed = await aiService.parseNaturalSearch(query);
        return success(res, parsed, 'Natural language query parsed');
    } catch (err) {
        console.error('Natural search error:', err);
        return error(res, 'Failed to parse natural query', 500);
    }
});

module.exports = router;
