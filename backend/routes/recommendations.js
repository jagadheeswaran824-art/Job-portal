const express  = require('express');
const db       = require('../db');
const { optionalAuth, authMiddleware } = require('../middleware/auth');
const aiService          = require('../services/aiService');
const { success, error } = require('../utils/response');

const router = express.Router();

// ── GET /api/recommendations ──────────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
    try {
        const limit = Math.min(30, parseInt(req.query.limit, 10) || 6);

        // Fetch candidate profile and goals if authenticated
        let candidateProfile = null;
        let careerGoal = null;

        if (req.user) {
            const [profiles] = await db.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
            const [skills]   = await db.query('SELECT skill_name FROM profile_skills WHERE user_id = ?', [req.user.id]);
            const [goals]    = await db.query('SELECT target_role, target_industry FROM career_goals WHERE user_id = ? LIMIT 1', [req.user.id]);
            
            candidateProfile = {
                profile: profiles[0] || {},
                skills: skills.map(s => s.skill_name),
            };
            careerGoal = goals[0] || null;
        }

        // Fetch active jobs
        const [jobs] = await db.query(
            `SELECT id, title, company_name, location, job_type, category, experience_level,
                    salary_min, salary_max, skills, is_featured, views, created_at
             FROM jobs
             WHERE status = 'active'
             ORDER BY created_at DESC
             LIMIT 50`
        );

        if (!candidateProfile || candidateProfile.skills.length === 0) {
            const results = jobs.slice(0, limit).map(j => {
                let skills = j.skills;
                if (typeof skills === 'string') {
                    try { skills = JSON.parse(skills); } catch { skills = []; }
                }
                return {
                    ...j,
                    skills: skills || [],
                    match_score: j.is_featured ? 88 : 75,
                    fit_level: j.is_featured ? 'Featured Match' : 'Popular Opportunity',
                    badge_color: '#4f46e5',
                    why_recommended: `High demand role at ${j.company_name} in ${j.location}.`,
                    matched_skills: (skills || []).slice(0, 2),
                    missing_skills: []
                };
            });
            return success(res, results, 'Recommended jobs');
        }

        // Score jobs against candidate skills and career goal
        const scoredJobs = await Promise.all(
            jobs.map(async (job) => {
                const matchResult = await aiService.calculateMatchScore(candidateProfile, job);
                let skills = job.skills;
                if (typeof skills === 'string') {
                    try { skills = JSON.parse(skills); } catch { skills = []; }
                }

                let whyReason = '';
                if (matchResult.matched_skills.length > 0) {
                    whyReason = `Matches ${matchResult.matched_skills.length} of your core skills (${matchResult.matched_skills.slice(0, 3).join(', ')}).`;
                } else if (careerGoal && job.title.toLowerCase().includes(careerGoal.target_role.toLowerCase())) {
                    whyReason = `Directly matches your target career goal: ${careerGoal.target_role}.`;
                } else {
                    whyReason = `Relevant ${job.category} opening aligned with your professional profile.`;
                }

                return {
                    ...job,
                    skills: skills || [],
                    match_score: matchResult.match_score,
                    fit_level: matchResult.fit_level,
                    badge_color: matchResult.badge_color,
                    matched_skills: matchResult.matched_skills,
                    missing_skills: matchResult.missing_skills,
                    why_recommended: whyReason,
                };
            })
        );

        scoredJobs.sort((a, b) => b.match_score - a.match_score);
        return success(res, scoredJobs.slice(0, limit), 'Personalized recommendations');

    } catch (err) {
        console.error('Recommendations error:', err);
        return error(res, 'Server error fetching recommendations', 500);
    }
});

// ── GET /api/recommendations/radar (Opportunity Radar) ─────────────────────────
router.get('/radar', authMiddleware, async (req, res) => {
    try {
        const [skills] = await db.query('SELECT skill_name FROM profile_skills WHERE user_id = ?', [req.user.id]);
        const userSkillNames = skills.map(s => s.skill_name);

        const [activeJobs] = await db.query("SELECT id, title, company_name, location, skills, salary_min, salary_max FROM jobs WHERE status = 'active'");
        
        let matchingJobs = [];
        activeJobs.forEach(job => {
            let jSkills = [];
            if (typeof job.skills === 'string') {
                try { jSkills = JSON.parse(job.skills); } catch { jSkills = []; }
            } else if (Array.isArray(job.skills)) {
                jSkills = job.skills;
            }

            const matched = jSkills.filter(js => userSkillNames.some(us => us.toLowerCase() === js.toLowerCase()));
            if (matched.length > 0 || userSkillNames.length === 0) {
                matchingJobs.push({
                    ...job,
                    skills: jSkills,
                    matched_count: matched.length,
                    matched_skills: matched
                });
            }
        });

        matchingJobs.sort((a, b) => b.matched_count - a.matched_count);

        const topSkills = userSkillNames.slice(0, 3).join(' + ') || 'your profile';
        const radarSummary = {
            total_matching_opportunities: matchingJobs.length,
            radar_headline: `${matchingJobs.length} active opportunities match ${topSkills}`,
            top_matches: matchingJobs.slice(0, 5),
            tracked_skills: userSkillNames
        };

        return success(res, radarSummary, 'Opportunity radar updated');
    } catch (err) {
        console.error('Opportunity radar error:', err);
        return error(res, 'Failed to update opportunity radar', 500);
    }
});

module.exports = router;
