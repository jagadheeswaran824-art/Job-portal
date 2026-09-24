/**
 * Comprehensive Automated API & Intelligence Test Suite
 * Validates 100% of Core and Upgraded AI Career Intelligence Platform Endpoints
 */

const http = require('http');
const app  = require('./server');

const TEST_PORT = 5099;
let server;

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

        const req = http.request({
            hostname: '127.0.0.1',
            port: TEST_PORT,
            path,
            method,
            headers,
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed;
                try { parsed = JSON.parse(data); } catch { parsed = data; }
                resolve({ status: res.statusCode, data: parsed });
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log('\n🧪 ═══════════════════════════════════════════════════════════════');
    console.log('   RUNNING AI CAREER INTELLIGENCE PLATFORM TEST SUITE');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    server = app.listen(TEST_PORT);
    let testsPassed = 0;
    let testsFailed = 0;

    function assert(cond, name) {
        if (cond) {
            console.log(`  ✅ PASS: ${name}`);
            testsPassed++;
        } else {
            console.error(`  ❌ FAIL: ${name}`);
            testsFailed++;
        }
    }

    try {
        // 1. Health check
        const health = await request('GET', '/api/health');
        assert(health.status === 200 && health.data.success === true, 'GET /api/health');

        // 2. Public Jobs list
        const jobs = await request('GET', '/api/jobs?limit=5');
        assert(jobs.status === 200 && Array.isArray(jobs.data.data), 'GET /api/jobs (Pagination & filter)');

        // 3. Featured jobs
        const featured = await request('GET', '/api/jobs/featured');
        assert(featured.status === 200 && Array.isArray(featured.data.data), 'GET /api/jobs/featured');

        // 4. Companies list
        const companies = await request('GET', '/api/jobs/companies');
        assert(companies.status === 200 && Array.isArray(companies.data.data), 'GET /api/jobs/companies');

        // 5. Natural Language Search
        const nlSearch = await request('GET', '/api/search?q=fresher+react+developer+chennai&natural=1');
        assert(nlSearch.status === 200 && nlSearch.data.data.jobs !== undefined, 'GET /api/search (Natural Language Intent Parsing)');

        // 6. Auth: Login as Seeker
        const seekerLogin = await request('POST', '/api/auth/login', {
            email: 'jagad@jobportal.com',
            password: 'Seeker@1234'
        });
        assert(seekerLogin.status === 200 && seekerLogin.data.data.token, 'POST /api/auth/login (Candidate JWT issuance)');
        const seekerToken = seekerLogin.data.data?.token;

        // 7. Auth: Login as Admin
        const adminLogin = await request('POST', '/api/auth/login', {
            email: 'admin@jobportal.com',
            password: 'Admin@1234'
        });
        assert(adminLogin.status === 200 && adminLogin.data.data.token, 'POST /api/auth/login (Admin JWT issuance)');
        const adminToken = adminLogin.data.data?.token;

        // 8. Auth: /api/auth/me
        const me = await request('GET', '/api/auth/me', null, seekerToken);
        assert(me.status === 200 && me.data.data.email === 'jagad@jobportal.com', 'GET /api/auth/me (Protected seeker verification)');

        // 8b. Dashboard: /api/dashboard/overview
        const dash = await request('GET', '/api/dashboard/overview', null, seekerToken);
        assert(dash.status === 200 && dash.data.data?.statistics !== undefined, 'GET /api/dashboard/overview (Candidate dashboard metrics)');

        // 9. Recommendations & Opportunity Radar
        const recs = await request('GET', '/api/recommendations', null, seekerToken);
        assert(recs.status === 200 && Array.isArray(recs.data.data), 'GET /api/recommendations (Personalized scoring)');

        const radar = await request('GET', '/api/recommendations/radar', null, seekerToken);
        assert(radar.status === 200 && radar.data.data.radar_headline !== undefined, 'GET /api/recommendations/radar (Opportunity Radar alerts)');

        // 10. AI Resume Analyzer
        const resumeAnalysis = await request('POST', '/api/ai/resume-analyzer', {
            resume_text: 'Experienced Full Stack Developer with React, TypeScript, Node.js, Express, and MySQL. Built high-traffic SaaS applications.'
        }, seekerToken);
        assert(resumeAnalysis.status === 200 && resumeAnalysis.data.data.ats_score > 0 && Array.isArray(resumeAnalysis.data.data.extracted_skills), 'POST /api/ai/resume-analyzer (ATS extraction & improvement suggestions)');

        // 11. AI Interview Prep
        const interviewPrep = await request('POST', '/api/ai/interview-prep', {
            job_title: 'Full Stack Engineer'
        });
        assert(interviewPrep.status === 200 && Array.isArray(interviewPrep.data.data.questions), 'POST /api/ai/interview-prep (Role-specific talking points)');

        // 12. AI Match Score with Rationales
        const firstJobId = (Array.isArray(jobs.data?.data) ? jobs.data.data[0]?.id : null) || 1;
        const matchScore = await request('POST', '/api/ai/match-score', {
            job_id: firstJobId,
            skills: ['React', 'Node.js', 'MySQL', 'JavaScript']
        }, seekerToken);
        assert(matchScore.status === 200 && matchScore.data.data.match_score >= 0 && Array.isArray(matchScore.data.data.why_match), 'POST /api/ai/match-score (Match score & explained rationales)');

        // 13. AI Cover Letter Generator
        const coverLetter = await request('POST', '/api/ai/cover-letter', {
            job_id: firstJobId,
            tone: 'professional'
        }, seekerToken);
        assert(coverLetter.status === 200 && coverLetter.data.data.cover_letter.length > 50, 'POST /api/ai/cover-letter (Tailored letter generation)');

        // 14. AI Career Assistant Chat
        const chat = await request('POST', '/api/ai/chat-assistant', {
            message: 'What skills should I learn next to become a senior developer?'
        }, seekerToken);
        assert(chat.status === 200 && chat.data.data.reply.length > 20, 'POST /api/ai/chat-assistant (Context-aware career assistant)');

        // 15. Job Safety Scanner
        const safety = await request('POST', '/api/ai/job-safety', {
            job_id: firstJobId
        });
        assert(safety.status === 200 && safety.data.data.safety_level !== undefined, 'POST /api/ai/job-safety (Transparent safety audit)');

        // 16. Career Goal Management
        const goalSave = await request('POST', '/api/career/goal', {
            target_role: 'Full Stack Developer',
            target_industry: 'Technology',
            target_salary: 1200000,
            current_level: 'Junior / Mid'
        }, seekerToken);
        assert(goalSave.status === 200, 'POST /api/career/goal (Save career target)');

        // 17. Skill Gap Analyzer
        const skillGap = await request('POST', '/api/career/skill-gap', {
            skills: ['JavaScript', 'HTML', 'CSS', 'React'],
            target_role: 'Full Stack Developer'
        }, seekerToken);
        assert(skillGap.status === 200 && skillGap.data.data.readiness_percentage !== undefined, 'POST /api/career/skill-gap (Possessed vs missing skills)');

        // 18. Career GPS Roadmap
        const gps = await request('POST', '/api/career/roadmap/generate', {
            target_role: 'Full Stack Developer',
            current_level: 'Junior'
        }, seekerToken);
        assert(gps.status === 200 && Array.isArray(gps.data.data.stages), 'POST /api/career/roadmap/generate (Milestone-by-milestone Career GPS)');

        // 19. Transparent Job Readiness Multi-Factor Score
        const readiness = await request('GET', '/api/career/readiness', null, seekerToken);
        assert(readiness.status === 200 && readiness.data.data.factors !== undefined, 'GET /api/career/readiness (5-factor transparent readiness calculation)');

        // 20. Skill Assessments List & Grading
        const assessments = await request('GET', '/api/assessments');
        assert(assessments.status === 200 && assessments.data.data.length >= 5, 'GET /api/assessments (Java, JS, React, SQL, Python tests)');

        const firstAssId = assessments.data.data[0]?.id || 1;
        const assSubmit = await request('POST', `/api/assessments/${firstAssId}/submit`, {
            answers: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 3 }
        }, seekerToken);
        assert(assSubmit.status === 200 && assSubmit.data.data.score !== undefined, 'POST /api/assessments/:id/submit (Automated grading & badge awarding)');

        // 21. AI Mock Interview Simulator
        const simStart = await request('POST', '/api/interviews/simulate/start', {
            role_title: 'Full Stack Developer',
            interview_type: 'Technical'
        }, seekerToken);
        assert(simStart.status === 200 && simStart.data.data.question !== undefined, 'POST /api/interviews/simulate/start (Simulation session initialized)');

        const simAnswer = await request('POST', '/api/interviews/simulate/answer', {
            role_title: 'Full Stack Developer',
            question: simStart.data.data.question,
            answer: 'I implement connection pooling with mysql2 and cache frequently read data in Redis to ensure high availability and sub-10ms response times.',
            question_index: 0,
            interview_type: 'Technical'
        }, seekerToken);
        assert(simAnswer.status === 200 && simAnswer.data.data.evaluation.overall_score > 0, 'POST /api/interviews/simulate/answer (Real-time criteria scoring & feedback)');

        // 22. AI Project Analyzer
        const projAnalyze = await request('POST', '/api/portfolio/analyze-project', {
            title: 'AI Career Intelligence Platform',
            technologies: ['React', 'Node.js', 'MySQL', 'Express']
        }, seekerToken);
        assert(projAnalyze.status === 200 && Array.isArray(projAnalyze.data.data.resume_bullet_points), 'POST /api/portfolio/analyze-project (STAR format bullet points generator)');

        // 23. Portfolio Synthesis Generator
        const portfolio = await request('GET', '/api/portfolio/generate', null, seekerToken);
        assert(portfolio.status === 200 && portfolio.data.data.profile !== undefined, 'GET /api/portfolio/generate (Synthesized portfolio schema)');

        // 24. Admin Overview & Platform Health
        const adminOverview = await request('GET', '/api/admin/overview', null, adminToken);
        assert(adminOverview.status === 200 && adminOverview.data.data.users !== undefined, 'GET /api/admin/overview (Role-gated administration)');

        // 25. OpenAPI 3.0 Documentation
        const openapi = await request('GET', '/api/openapi.json');
        assert(openapi.status === 200 && openapi.data.openapi === '3.0.3', 'GET /api/openapi.json (OpenAPI 3.0 Documentation)');

        // ═══════════════════════════════════════════════════════════════════════
        // SECURITY & SCAM PROTECTION MODULE TESTS
        // ═══════════════════════════════════════════════════════════════════════

        // 26. Safe-looking URL evaluation (LOW_RISK)
        const safeUrlTest = await request('POST', '/api/security/check-url', {
            url: 'https://careers.google.com/jobs/results/software-engineer',
            company_name: 'Google'
        });
        assert(
            safeUrlTest.status === 200 &&
            safeUrlTest.data.data.risk_level === 'LOW_RISK' &&
            safeUrlTest.data.data.score >= 85,
            'POST /api/security/check-url (Safe-looking corporate URL -> LOW_RISK)'
        );

        // 27. Suspicious URL: Direct IP Address host (HIGH_RISK)
        const ipUrlTest = await request('POST', '/api/security/check-url', {
            url: 'http://198.51.100.42/careers/apply'
        });
        assert(
            ipUrlTest.status === 200 &&
            ipUrlTest.data.data.risk_level === 'HIGH_RISK' &&
            ipUrlTest.data.data.signals.is_ip_host === true,
            'POST /api/security/check-url (Direct numeric IP host -> HIGH_RISK)'
        );

        // 28. Suspicious URL: Shortened domain & payment keyword (HIGH_RISK / CAUTION)
        const shortenerTest = await request('POST', '/api/security/check-url', {
            url: 'https://bit.ly/quick-job-apply?registration-fee=500&pay-now=1'
        });
        assert(
            shortenerTest.status === 200 &&
            ['HIGH_RISK', 'CAUTION'].includes(shortenerTest.data.data.risk_level) &&
            shortenerTest.data.data.signals.is_shortener === true,
            'POST /api/security/check-url (Shortened URL & fee keywords -> Risk flagged)'
        );

        // 29. Suspicious URL: Dangerous direct executable download (.exe) (HIGH_RISK)
        const exeUrlTest = await request('POST', '/api/security/check-url', {
            url: 'https://careers-portal.com/download/application-form.exe'
        });
        assert(
            exeUrlTest.status === 200 &&
            exeUrlTest.data.data.risk_level === 'HIGH_RISK' &&
            exeUrlTest.data.data.signals.dangerous_download === true,
            'POST /api/security/check-url (Executable payload download -> HIGH_RISK)'
        );

        // 30. Invalid URL format handling (UNKNOWN - not safe)
        const invalidUrlTest = await request('POST', '/api/security/check-url', {
            url: 'http://::invalid-url-domain::'
        });
        assert(
            invalidUrlTest.status === 200 &&
            invalidUrlTest.data.data.risk_level === 'UNKNOWN' &&
            invalidUrlTest.data.data.status_text.includes('Safety could not be fully verified'),
            'POST /api/security/check-url (Invalid URL format -> UNKNOWN with safety warning)'
        );

        // 31. Empty URL handling (UNKNOWN)
        const emptyUrlTest = await request('POST', '/api/security/check-url', {
            url: ''
        });
        assert(
            emptyUrlTest.status === 200 &&
            emptyUrlTest.data.data.risk_level === 'UNKNOWN',
            'POST /api/security/check-url (Empty URL -> UNKNOWN)'
        );

        // 32. Job Posting Safety Audit endpoint
        const jobSafetyAudit = await request('GET', '/api/security/check-job/1');
        assert(
            jobSafetyAudit.status === 200 &&
            jobSafetyAudit.data.data.risk_level !== undefined &&
            Array.isArray(jobSafetyAudit.data.data.recommendations),
            'GET /api/security/check-job/:id (Job posting safety audit & recommendations)'
        );

        // 33. Job with upfront payment / fee scam pattern
        const scamScan = await request('POST', '/api/ai/job-safety', {
            title: 'Data Entry Assistant',
            company_name: 'Fast Cash Global',
            description: 'Immediate hiring! Send registration fee of 500 INR for kit. Contact on Telegram only.',
            requirements: 'No experience required'
        });
        assert(
            scamScan.status === 200 &&
            scamScan.data.data.safety_level === 'warning' &&
            scamScan.data.data.warning_flags.length > 0,
            'POST /api/ai/job-safety (Upfront fee & Telegram pattern detection)'
        );

        // 34. Candidate Report Job submission
        const reportSubmit = await request('POST', '/api/security/report-job', {
            job_id: 1,
            reason: 'payment_request',
            details: 'Recruiter asked for upfront training fees on Telegram.',
            reporter_email: 'jagad@jobportal.com'
        }, seekerToken);
        assert(
            reportSubmit.status === 201 &&
            reportSubmit.data.data.id !== undefined,
            'POST /api/security/report-job (Store user report in database)'
        );
        const reportId = reportSubmit.data.data?.id;

        // 35. Admin Security Overview
        const secOverview = await request('GET', '/api/admin/security/overview', null, adminToken);
        assert(
            secOverview.status === 200 &&
            secOverview.data.data.total_checks !== undefined &&
            secOverview.data.data.total_reports !== undefined,
            'GET /api/admin/security/overview (Admin Security Center metrics)'
        );

        // 36. Admin Security Reports & Investigation Status update
        const secReports = await request('GET', '/api/admin/security/reports', null, adminToken);
        assert(
            secReports.status === 200 &&
            Array.isArray(secReports.data.data),
            'GET /api/admin/security/reports (Fetch reported jobs for review)'
        );

        if (reportId) {
            const updateReport = await request('PATCH', `/api/admin/security/reports/${reportId}/status`, {
                status: 'investigating',
                admin_notes: 'Under review by trust & safety team'
            }, adminToken);
            assert(
                updateReport.status === 200 &&
                updateReport.data.data.status === 'investigating',
                'PATCH /api/admin/security/reports/:id/status (Review & update report status)'
            );
        }

        // 37. Security Telemetry Stats & Demo Cases
        const demoCases = await request('GET', '/api/security/demo-cases');
        assert(
            demoCases.status === 200 &&
            Array.isArray(demoCases.data.data) &&
            demoCases.data.data.length >= 4,
            'GET /api/security/demo-cases (Retrieve multi-scenario test presets)'
        );

        const secStats = await request('GET', '/api/security/stats');
        assert(
            secStats.status === 200 &&
            secStats.data.data.total_urls_scanned > 0,
            'GET /api/security/stats (Platform security telemetry)'
        );

    } catch (err) {
        console.error('Test execution error:', err);
        testsFailed++;
    } finally {
        server.close();
        console.log('\n───────────────────────────────────────────────────────────────');
        console.log(`Results: ${testsPassed} Passed, ${testsFailed} Failed`);
        console.log('───────────────────────────────────────────────────────────────\n');
        process.exitCode = testsFailed === 0 ? 0 : 1;
    }
}

runTests();
