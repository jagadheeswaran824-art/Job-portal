const express  = require('express');
const db       = require('../db');
const { optionalAuth }   = require('../middleware/auth');
const aiService = require('../services/aiService');
const { success, error } = require('../utils/response');

const router = express.Router();

/**
 * GET /api/search
 * Intelligent search across jobs, companies, and skills
 * Supports natural language queries e.g. "Find fresher Java jobs in Chennai", "React internships remote"
 */
router.get('/', optionalAuth, async (req, res) => {
    try {
        let query = (req.query.q || req.query.query || '').trim();
        let locationQuery = (req.query.location || '').trim();
        let categoryQuery = (req.query.category || '').trim();
        let jobTypeQuery  = (req.query.job_type || '').trim();
        let expQuery      = (req.query.experience_level || '').trim();
        const limit       = Math.min(50, parseInt(req.query.limit, 10) || 15);

        let parsedNlp = null;

        // Check if query is natural language sentence
        if (query && (query.includes(' ') || req.query.natural === '1')) {
            parsedNlp = await aiService.parseNaturalSearch(query);
            if (parsedNlp.location && !locationQuery) locationQuery = parsedNlp.location;
            if (parsedNlp.category && !categoryQuery) categoryQuery = parsedNlp.category;
            if (parsedNlp.job_type && !jobTypeQuery) jobTypeQuery = parsedNlp.job_type;
            if (parsedNlp.experience_level && !expQuery) expQuery = parsedNlp.experience_level;
            if (parsedNlp.search && parsedNlp.search !== query) {
                query = parsedNlp.search;
            }
        }

        let where = ["status = 'active'"];
        let params = [];

        if (query) {
            where.push(`(
                title LIKE ? OR 
                company_name LIKE ? OR 
                description LIKE ? OR 
                location LIKE ? OR 
                category LIKE ?
            )`);
            const s = `%${query}%`;
            params.push(s, s, s, s, s);
        }

        if (locationQuery) {
            where.push('location LIKE ?');
            params.push(`%${locationQuery}%`);
        }

        if (categoryQuery) {
            where.push('category = ?');
            params.push(categoryQuery);
        }

        if (jobTypeQuery) {
            where.push('job_type = ?');
            params.push(jobTypeQuery);
        }

        if (expQuery) {
            where.push('experience_level = ?');
            params.push(expQuery);
        }

        const whereSql = 'WHERE ' + where.join(' AND ');

        // Matching jobs
        const [jobs] = await db.query(
            `SELECT id, title, company_name, location, job_type, category, experience_level,
                    salary_min, salary_max, skills, is_featured, views, created_at
             FROM jobs ${whereSql}
             ORDER BY is_featured DESC, created_at DESC
             LIMIT ?`,
            [...params, limit]
        );

        // Matching companies
        let companies = [];
        if (query) {
            const [compRows] = await db.query(
                `SELECT company_name, COUNT(*) AS job_count, MAX(location) AS location
                 FROM jobs
                 WHERE status = 'active' AND company_name LIKE ?
                 GROUP BY company_name
                 LIMIT 5`,
                [`%${query}%`]
            );
            companies = compRows;
        }

        const parsedJobs = jobs.map(j => {
            let s = j.skills;
            if (typeof s === 'string') {
                try { s = JSON.parse(s); } catch { s = []; }
            }
            return { ...j, skills: s || [] };
        });

        return success(res, {
            query,
            total_matches: parsedJobs.length,
            jobs: parsedJobs,
            companies,
            natural_filters: parsedNlp ? {
                interpreted_filter: parsedNlp.natural_explanation,
                extracted_skills: parsedNlp.skills,
                location: locationQuery,
                job_type: jobTypeQuery,
                experience_level: expQuery
            } : null
        }, 'Search completed');

    } catch (err) {
        console.error('Search error:', err);
        return error(res, 'Server error executing search', 500);
    }
});

module.exports = router;
