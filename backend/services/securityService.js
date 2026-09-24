/**
 * Job Safety & Web Protection Intelligence Service
 * 
 * Provides automated, multi-signal security evaluation for URLs, external links,
 * recruiter domains, and job postings to protect candidates against scams, phishing,
 * and malicious downloads.
 * 
 * Security Levels:
 * - LOW_RISK: No major warning indicators detected.
 * - CAUTION: Some warning indicators were detected. Review before continuing.
 * - HIGH_RISK: Multiple warning indicators detected. Avoid sharing sensitive information.
 * - UNKNOWN: Safety could not be fully verified (Note: UNKNOWN is never treated as safe).
 */

const crypto = require('crypto');
const db     = require('../db');

// Known URL shortener hostnames
const URL_SHORTENERS = new Set([
    'bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'buff.ly', 'ow.ly', 'cutt.ly',
    'rb.gy', 'shorturl.at', 'linktr.ee', 'tiny.cc', 'rebrand.ly', 'tny.sh',
    'v.gd', 'bc.vc', 'goo.gl', 'shorte.st', 'adfly.com', 'clck.ru'
]);

// Known verified corporate ATS / job distribution platforms (reputable external destinations)
const TRUSTED_ATS_DOMAINS = new Set([
    'greenhouse.io', 'lever.co', 'workday.com', 'myworkdayjobs.com', 'smartrecruiters.com',
    'ashbyhq.com', 'bamboohr.com', 'jobvite.com', 'recruitee.com', 'workable.com',
    'icims.com', 'taleo.net', 'successfactors.com', 'breezy.hr', 'applytojob.com',
    'rippling.com', 'gusto.com', 'jazzhr.com', 'pinpointhq.com'
]);

// Suspicious / high-risk top-level domains frequently abused for scams & disposable phishing
const HIGH_RISK_TLDS = new Set([
    'xyz', 'top', 'click', 'work', 'loan', 'gq', 'cf', 'tk', 'ml', 'ga',
    'buzz', 'cam', 'surf', 'rest', 'monster', 'country', 'stream', 'download',
    'racing', 'win', 'vip', 'bid', 'party', 'trade', 'date', 'faith', 'accountant'
]);

// Suspicious file extensions for application links (direct executables / scripts masquerading as forms)
const DANGEROUS_EXTENSIONS = [
    '.exe', '.scr', '.bat', '.vbs', '.apk', '.msi', '.cmd', '.ps1', '.zip',
    '.rar', '.7z', '.iso', '.jar', '.dmg', '.pkg', '.hta', '.wsf', '.reg'
];

// Suspicious keyword patterns in URL pathname and querystring
const SUSPICIOUS_URL_KEYWORDS = [
    { pattern: /(?:registration[-_]?fee|reg[-_]?fee|entry[-_]?fee)/i, label: 'Registration or application fee parameter in URL' },
    { pattern: /(?:pay[-_]?now|payment|deposit|wire[-_]?transfer|crypto[-_]?pay)/i, label: 'Payment processing or monetary transfer pattern in URL' },
    { pattern: /(?:verify[-_]?otp|send[-_]?otp|request[-_]?otp)/i, label: 'OTP / 2FA solicitation pattern in URL' },
    { pattern: /(?:password|credentials|login[-_]?verify|account[-_]?unlock)/i, label: 'Credential harvesting pattern in URL path' },
    { pattern: /(?:ssn|national[-_]?id|bank[-_]?details|debit[-_]?card)/i, label: 'Sensitive identity / banking data request in URL' },
    { pattern: /(?:t\.me\/|telegram\.org|chat\.whatsapp\.com)/i, label: 'Direct redirect to unmonitored messaging channel' },
    { pattern: /(?:claim[-_]?prize|instant[-_]?hire|guaranteed[-_]?job)/i, label: 'Unrealistic hiring guarantee claim in URL' },
];

class SecurityService {

    /**
     * Analyze a target website or application URL
     * @param {string} rawUrl 
     * @param {object} context { claimed_company, company_website, job_id, user_id }
     */
    async analyzeUrl(rawUrl, context = {}) {
        const inputUrl = (rawUrl || '').trim();

        // 1. Handle empty / missing URL
        if (!inputUrl) {
            return {
                risk_level: 'UNKNOWN',
                score: 50,
                status_text: 'Safety could not be fully verified (No URL provided)',
                url: '',
                domain: '',
                indicators: [{
                    code: 'EMPTY_URL',
                    severity: 'medium',
                    title: 'Missing URL',
                    description: 'No website URL was provided for analysis.'
                }],
                recommendations: [
                    'Provide a complete website URL starting with https:// to perform a safety check.',
                    'Always verify the official corporate career portal before submitting personal information.'
                ],
                signals: {
                    https: false,
                    valid_domain: false,
                    is_external: false,
                    is_shortener: false,
                    is_ip_host: false,
                    dangerous_download: false,
                    company_match: null,
                    suspicious_keywords_found: []
                },
                ai_analysis: 'Without a target URL, security verification cannot proceed. Safety could not be fully verified.'
            };
        }

        // 2. Parse URL structure
        let parsedUrl;
        let isHttps = false;
        let domain = '';
        let pathname = '';
        let search = '';
        let protocol = '';

        try {
            // Prepend https:// if user omitted protocol for convenience
            let normalizedInput = inputUrl;
            if (!/^https?:\/\//i.test(normalizedInput)) {
                normalizedInput = 'https://' + normalizedInput;
            }
            parsedUrl = new URL(normalizedInput);
            protocol = parsedUrl.protocol.toLowerCase();
            isHttps = protocol === 'https:';
            domain = parsedUrl.hostname.toLowerCase();
            pathname = parsedUrl.pathname.toLowerCase();
            search = parsedUrl.search.toLowerCase();
        } catch (err) {
            // Invalid / malformed URL format
            return {
                risk_level: 'UNKNOWN',
                score: 40,
                status_text: 'Safety could not be fully verified (Invalid URL format)',
                url: inputUrl,
                domain: '',
                indicators: [{
                    code: 'INVALID_URL_FORMAT',
                    severity: 'medium',
                    title: 'Invalid URL Format',
                    description: 'The supplied URL could not be parsed into a standard web address format.'
                }],
                recommendations: [
                    'Ensure the URL follows a standard format, e.g., https://company.com/careers',
                    'Do not click on malformed or broken links received in direct messages.'
                ],
                signals: {
                    https: false,
                    valid_domain: false,
                    is_external: true,
                    is_shortener: false,
                    is_ip_host: false,
                    dangerous_download: false,
                    company_match: null,
                    suspicious_keywords_found: []
                },
                ai_analysis: 'The destination address has an invalid or unparseable format. Safety could not be fully verified.'
            };
        }

        const indicators = [];
        const recommendations = [];
        let score = 100; // Starts at 100 (Safe) and decreases with warning signals

        // 3. HTTPS Availability check
        if (!isHttps) {
            score -= 25;
            indicators.push({
                code: 'NO_HTTPS',
                severity: 'medium',
                title: 'Unencrypted Connection (HTTP)',
                description: 'The application destination does not enforce HTTPS encryption. Any credentials or resumes sent may be intercepted.'
            });
            recommendations.push('Avoid submitting resumes, passwords, or personal documents over unencrypted HTTP connections.');
        }

        // 4. IP Address host check (e.g., http://192.168.1.1 or http://45.33.32.156)
        const isIpHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(domain) || /^\[?[a-fA-F0-9:]+\]?$/.test(domain);
        if (isIpHost) {
            score -= 50;
            indicators.push({
                code: 'IP_ADDRESS_HOST',
                severity: 'high',
                title: 'Direct IP Address Destination',
                description: `The URL connects directly to a numeric IP address (${domain}) rather than a registered corporate domain name.`
            });
            recommendations.push('Legitimate corporate employers use registered domain names. Exercise extreme caution.');
        }

        // 5. URL Shortening Services check
        const isShortener = URL_SHORTENERS.has(domain) || domain.endsWith('.link');
        if (isShortener) {
            score -= 30;
            indicators.push({
                code: 'URL_SHORTENER',
                severity: 'medium',
                title: 'Shortened / Masked URL',
                description: `The link uses a URL shortener (${domain}) that hides the true destination server.`
            });
            recommendations.push('Expand or preview shortened links before clicking to confirm where they lead.');
        }

        // 6. Suspicious TLD check
        const domainParts = domain.split('.');
        const tld = domainParts.length > 1 ? domainParts[domainParts.length - 1] : '';
        if (HIGH_RISK_TLDS.has(tld)) {
            score -= 30;
            indicators.push({
                code: 'SUSPICIOUS_TLD',
                severity: 'medium',
                title: `Unusual Top-Level Domain (.${tld})`,
                description: `The domain uses a .${tld} extension that is frequently associated with disposable websites and phishing campaigns.`
            });
            recommendations.push(`Verify whether the company officially operates on the .${tld} domain extension.`);
        }

        // 7. Dangerous File Download check
        let dangerousDownload = false;
        let detectedExtension = '';
        for (const ext of DANGEROUS_EXTENSIONS) {
            if (pathname.endsWith(ext) || pathname.includes(ext + '?')) {
                dangerousDownload = true;
                detectedExtension = ext;
                break;
            }
        }
        if (dangerousDownload) {
            score -= 60;
            indicators.push({
                code: 'DANGEROUS_DOWNLOAD',
                severity: 'high',
                title: `Suspicious Direct File Download (${detectedExtension})`,
                description: `The link initiates a direct download of an executable or script (${detectedExtension}) instead of opening a web application form.`
            });
            recommendations.push('Never download or execute unfamiliar .exe, .scr, or script files presented as application forms.');
        }

        // 8. Suspicious Keywords in URL path or parameters
        const fullUrlString = parsedUrl.toString();
        const flaggedKeywords = [];
        SUSPICIOUS_URL_KEYWORDS.forEach(k => {
            if (k.pattern.test(fullUrlString)) {
                flaggedKeywords.push(k.label);
                score -= 20;
                indicators.push({
                    code: 'SUSPICIOUS_URL_KEYWORD',
                    severity: 'high',
                    title: 'Suspicious Parameter Detected',
                    description: k.label
                });
            }
        });

        // 9. External Application Destination & Domain Mismatch check
        let isExternal = true;
        let companyMatch = null;
        const currentHost = 'jobportal.com'; // internal portal domain reference

        if (domain === 'localhost' || domain === '127.0.0.1' || domain.includes('jobportal')) {
            isExternal = false;
        }

        const claimedCompany = (context.claimed_company || '').trim().toLowerCase();
        const companyWebsite = (context.company_website || '').trim().toLowerCase();

        if (isExternal && !isShortener && !isIpHost) {
            // Check if domain is a known reputable ATS
            const isTrustedAts = Array.from(TRUSTED_ATS_DOMAINS).some(ats => domain === ats || domain.endsWith('.' + ats));

            if (isTrustedAts) {
                indicators.push({
                    code: 'TRUSTED_ATS_DESTINATION',
                    severity: 'info',
                    title: 'Recognized Applicant Tracking System',
                    description: `The application is hosted on a recognized enterprise recruitment platform (${domain}).`
                });
            } else if (companyWebsite) {
                try {
                    const compDomain = new URL(companyWebsite.startsWith('http') ? companyWebsite : 'https://' + companyWebsite).hostname.toLowerCase();
                    const cleanCompDomain = compDomain.replace(/^www\./, '');
                    const cleanUrlDomain  = domain.replace(/^www\./, '');

                    if (cleanUrlDomain === cleanCompDomain || cleanUrlDomain.endsWith('.' + cleanCompDomain)) {
                        companyMatch = true;
                    } else {
                        companyMatch = false;
                        score -= 25;
                        indicators.push({
                            code: 'DOMAIN_MISMATCH',
                            severity: 'medium',
                            title: 'Domain Differs from Company Website',
                            description: `The application domain (${domain}) differs from the stated company website (${compDomain}).`
                        });
                        recommendations.push(`Cross-check the job posting on ${compDomain} to verify this application link.`);
                    }
                } catch (e) {
                    // Ignored if companyWebsite unparseable
                }
            } else if (claimedCompany && claimedCompany.length >= 4) {
                // Check if claimed company name (e.g. "Google", "Microsoft") is completely absent or mimicked
                const sanitizedComp = claimedCompany.replace(/[^a-z0-9]/g, '');
                const sanitizedDom  = domain.replace(/[^a-z0-9]/g, '');

                if (['google', 'microsoft', 'apple', 'amazon', 'meta', 'netflix', 'infosys', 'tcs', 'wipro', 'ibm'].includes(sanitizedComp)) {
                    if (!sanitizedDom.includes(sanitizedComp) || (sanitizedDom.includes(sanitizedComp) && !domain.endsWith('.' + sanitizedComp + '.com') && domain !== sanitizedComp + '.com')) {
                        if (!Array.from(TRUSTED_ATS_DOMAINS).some(ats => domain.endsWith(ats))) {
                            score -= 35;
                            indicators.push({
                                code: 'BRAND_IMPERSONATION_RISK',
                                severity: 'high',
                                title: 'Claimed Enterprise Employer Domain Mismatch',
                                description: `The listing claims to represent ${context.claimed_company}, but the link points to ${domain}.`
                            });
                            recommendations.push(`Apply directly through the official ${context.claimed_company} career portal.`);
                        }
                    }
                }
            }

            if (isExternal) {
                indicators.push({
                    code: 'EXTERNAL_DESTINATION',
                    severity: 'info',
                    title: 'External Website Destination',
                    description: `This application process takes place outside the Job Portal on ${domain}.`
                });
            }
        }

        // 10. Compute Risk Level
        let riskLevel = 'LOW_RISK';
        let statusText = 'No major warning indicators detected.';

        const highCount   = indicators.filter(i => i.severity === 'high').length;
        const mediumCount = indicators.filter(i => i.severity === 'medium').length;

        if (highCount >= 1 || score < 50) {
            riskLevel = 'HIGH_RISK';
            statusText = 'Multiple warning indicators detected. Avoid sharing sensitive information until verified.';
            if (recommendations.length === 0) {
                recommendations.push('Do not share passwords, OTPs, or bank account details with this website.');
            }
        } else if (mediumCount >= 1 || score < 85) {
            riskLevel = 'CAUTION';
            statusText = 'Some warning indicators were detected. Review before continuing.';
            if (recommendations.length === 0) {
                recommendations.push('Review the destination website carefully before submitting personal credentials.');
            }
        } else {
            riskLevel = 'LOW_RISK';
            statusText = 'No major warning indicators detected.';
            recommendations.push('Ensure the company details match the official organization profile.');
            recommendations.push('Never transfer money or pay registration fees for employment opportunities.');
        }

        // Guarantee concrete AI contextual explanation without claiming absolute certainty
        let aiAnalysis = '';
        if (riskLevel === 'HIGH_RISK') {
            aiAnalysis = `Our automated security evaluation detected high-risk patterns (${indicators.map(i => i.title).slice(0, 3).join(', ')}). These concrete indicators require additional verification through official corporate channels before sharing contact details or resumes.`;
        } else if (riskLevel === 'CAUTION') {
            aiAnalysis = `Certain caution signals were identified (${indicators.map(i => i.title).join(', ')}). While this external website may be legitimate, candidates are advised to verify the employer identity prior to proceeding.`;
        } else {
            aiAnalysis = `The provided URL satisfies standard protocol and domain formatting heuristics. Legitimate hiring procedures apply. Always exercise standard diligence.`;
        }

        const result = {
            risk_level: riskLevel,
            score: Math.max(0, Math.min(100, score)),
            status_text: statusText,
            url: inputUrl,
            domain: domain,
            is_external: isExternal,
            indicators: indicators,
            recommendations: recommendations,
            signals: {
                https: isHttps,
                valid_domain: true,
                is_external: isExternal,
                is_shortener: isShortener,
                is_ip_host: isIpHost,
                dangerous_download: dangerousDownload,
                company_match: companyMatch,
                suspicious_keywords_found: flaggedKeywords
            },
            ai_analysis: aiAnalysis,
            checked_at: new Date().toISOString()
        };

        // Fire-and-forget database persistence
        this.recordCheck(result, context).catch(() => {});

        return result;
    }

    /**
     * Analyze a full job posting for scam patterns
     * @param {object} job 
     */
    async analyzeJobPosting(job = {}) {
        const text = `${job.title || ''} ${job.description || ''} ${job.requirements || ''} ${job.company_name || ''}`.toLowerCase();
        const indicators = [];
        const recommendations = [];
        let score = 100;

        // 1. Payment / Registration / Deposit requests (High Risk)
        if (
            text.includes('registration fee') || text.includes('processing fee') ||
            text.includes('security deposit') || text.includes('pay money') ||
            text.includes('training fee') || text.includes('kit fee') ||
            text.includes('send money') || text.includes('application fee')
        ) {
            score -= 50;
            indicators.push({
                code: 'PAYMENT_REQUEST',
                severity: 'high',
                title: 'Employer Requests Upfront Payment / Fees',
                description: 'The job posting mentions registration fees, training deposits, or application charges. Legitimate employers NEVER charge candidates for applying or interview processes.'
            });
            recommendations.push('Never transfer money, purchase supplies upfront, or pay registration charges for a job offer.');
        }

        // 2. Sensitive banking / OTP / Password requests (High Risk)
        if (
            text.includes('bank details') || text.includes('debit card') ||
            text.includes('otp') || text.includes('password') ||
            text.includes('net banking') || text.includes('upi pin')
        ) {
            score -= 50;
            indicators.push({
                code: 'SENSITIVE_CREDENTIAL_SOLICITATION',
                severity: 'high',
                title: 'Solicitation of Banking Credentials / OTP',
                description: 'The job requests banking credentials, debit card info, or OTP codes before employment confirmation.'
            });
            recommendations.push('Do not share banking credentials, passwords, or one-time passcodes under any circumstances.');
        }

        // 3. Unrealistic salary claims / Too-good-to-be-true promises (Medium Risk)
        if (
            (job.salary_min && Number(job.salary_min) > 4000000 && (!job.requirements || job.requirements.length < 40)) ||
            text.includes('earn 50000 daily') || text.includes('earn $500 per day') ||
            text.includes('no experience 100k') || text.includes('guaranteed daily payout')
        ) {
            score -= 30;
            indicators.push({
                code: 'UNREALISTIC_COMPENSATION',
                severity: 'medium',
                title: 'Unusually High Salary with Minimal Requirements',
                description: 'The listing advertises compensation significantly above industry standard with virtually zero qualification criteria.'
            });
            recommendations.push('Exercise caution with offers promising unusually high earnings for minimal effort.');
        }

        // 4. Unofficial contact channels (e.g., Telegram / WhatsApp exclusively for corporate enterprise)
        if (
            text.includes('telegram') || text.includes('whatsapp only') ||
            text.includes('contact on telegram') || text.includes('dm on whatsapp') ||
            text.includes('@gmail.com only') || text.includes('@yahoo.com')
        ) {
            score -= 25;
            indicators.push({
                code: 'UNOFFICIAL_COMMUNICATION_CHANNEL',
                severity: 'medium',
                title: 'Informal / Unofficial Communication Channels',
                description: 'Communication is directed exclusively to personal messenger apps (Telegram/WhatsApp) or free generic webmail rather than corporate domains.'
            });
            recommendations.push('Verify recruiter identity through the company’s official LinkedIn page or career portal.');
        }

        // 5. Incomplete company information
        if (!job.company_name || job.company_name.trim().length < 3 || job.company_name.toLowerCase().includes('confidential company')) {
            score -= 15;
            indicators.push({
                code: 'INCOMPLETE_COMPANY_INFO',
                severity: 'low',
                title: 'Missing or Generic Company Information',
                description: 'The employer identity is undisclosed or lacks official registered details.'
            });
            recommendations.push('Request verified company incorporation details before providing personal documents.');
        }

        // 6. Evaluate Application URL if present on job
        let urlScan = null;
        if (job.application_url) {
            urlScan = await this.analyzeUrl(job.application_url, {
                claimed_company: job.company_name,
                company_website: job.company_website,
                job_id: job.id
            });
            // Merge url indicators
            urlScan.indicators.forEach(ind => {
                if (ind.severity === 'high' || ind.severity === 'medium') {
                    indicators.push(ind);
                }
            });
            if (urlScan.risk_level === 'HIGH_RISK') score -= 35;
            else if (urlScan.risk_level === 'CAUTION') score -= 15;
        }

        // Risk Level determination
        let riskLevel = 'LOW_RISK';
        let statusText = 'No major warning indicators detected.';

        const highFlags   = indicators.filter(i => i.severity === 'high').length;
        const mediumFlags = indicators.filter(i => i.severity === 'medium').length;

        if (highFlags >= 1 || score < 50) {
            riskLevel = 'HIGH_RISK';
            statusText = 'Multiple warning indicators detected. Avoid sharing sensitive information until verified.';
        } else if (mediumFlags >= 1 || score < 85) {
            riskLevel = 'CAUTION';
            statusText = 'Some warning indicators were detected. Review before continuing.';
        } else {
            riskLevel = 'LOW_RISK';
            statusText = 'No major warning indicators detected.';
            if (recommendations.length === 0) {
                recommendations.push('Standard verified listing. Apply with confidence following normal hiring procedures.');
            }
        }

        return {
            job_id: job.id || null,
            job_title: job.title || 'Job Listing',
            company_name: job.company_name || 'Company',
            risk_level: riskLevel,
            score: Math.max(0, Math.min(100, score)),
            status_text: statusText,
            indicators: indicators,
            recommendations: recommendations,
            url_scan: urlScan,
            has_application_link: !!job.application_url,
            application_url: job.application_url || null,
            ai_explanation: indicators.length > 0
                ? `Safety audit identified specific signals: ${indicators.map(i => i.title).join('; ')}. Verify the employer through an official company channel before proceeding.`
                : 'This listing passed all automated safety heuristic checks. Standard hiring practices apply.',
            checked_at: new Date().toISOString()
        };
    }

    /**
     * Persist security check to database
     */
    async recordCheck(scanResult, context = {}) {
        try {
            const url = scanResult.url || '';
            const domain = scanResult.domain || '';
            const riskLevel = scanResult.risk_level || 'UNKNOWN';
            const userId = context.user_id || null;
            const jobId  = context.job_id  || null;
            const isDemo = context.is_demo ? 1 : 0;

            await db.query(`
                INSERT INTO security_checks
                (user_id, job_id, url, domain, risk_level, score, indicators, recommendations, signals, is_external, is_demo, checked_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                userId,
                jobId,
                url.slice(0, 2048),
                domain.slice(0, 255),
                riskLevel,
                scanResult.score || 100,
                JSON.stringify(scanResult.indicators || []),
                JSON.stringify(scanResult.recommendations || []),
                JSON.stringify(scanResult.signals || {}),
                scanResult.is_external ? 1 : 0,
                isDemo
            ]);

            // Cache / upsert in url_security_results
            if (url) {
                const urlHash = crypto.createHash('sha256').update(url).digest('hex');
                await db.query(`
                    INSERT INTO url_security_results
                    (url_hash, url, domain, risk_level, indicators, threat_types, last_scanned_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE
                        risk_level = VALUES(risk_level),
                        indicators = VALUES(indicators),
                        threat_types = VALUES(threat_types),
                        last_scanned_at = NOW()
                `, [
                    urlHash,
                    url.slice(0, 2048),
                    domain.slice(0, 255),
                    riskLevel,
                    JSON.stringify(scanResult.indicators || []),
                    JSON.stringify(scanResult.indicators.map(i => i.code))
                ]);
            }
        } catch (err) {
            // Non-fatal logging failure
            console.error('Record security check error:', err.message);
        }
    }

    /**
     * Record a user report on a job
     */
    async reportJob(reportData) {
        const {
            job_id,
            user_id = null,
            reporter_name = 'Anonymous',
            reporter_email = null,
            reason,
            details = '',
            url = null
        } = reportData;

        if (!job_id) throw new Error('job_id is required');
        if (!reason) throw new Error('reason is required');

        const [result] = await db.query(`
            INSERT INTO job_security_reports
            (job_id, user_id, reporter_name, reporter_email, reason, details, url, risk_level, admin_review_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'HIGH_RISK', 'pending', NOW())
        `, [
            job_id,
            user_id,
            reporter_name.slice(0, 150),
            reporter_email ? reporter_email.slice(0, 150) : null,
            reason,
            details,
            url ? url.slice(0, 2048) : null
        ]);

        // Record security event
        await db.query(`
            INSERT INTO security_events
            (user_id, event_type, severity, details, created_at)
            VALUES (?, 'job_reported', 'high', ?, NOW())
        `, [
            user_id,
            JSON.stringify({ report_id: result.insertId, job_id, reason, reporter_email })
        ]);

        return { id: result.insertId, status: 'pending' };
    }

    /**
     * Get realistic pre-configured demonstration cases for instant user testing
     */
    getDemoCases() {
        return [
            {
                id: 'demo-safe',
                title: 'Verified Enterprise Application',
                category: '🟢 LOW_RISK',
                badge_class: 'safe',
                url: 'https://careers.technovasolutions.com/jobs/senior-frontend-architect',
                description: 'Official verified corporate career portal with TLS 1.3 HTTPS encryption and verified domain.'
            },
            {
                id: 'demo-caution',
                title: 'External Startup / Shortened Link',
                category: '🟡 CAUTION',
                badge_class: 'caution',
                url: 'https://bit.ly/startup-engineer-apply-2026',
                description: 'Shortened URL redirecting to external 3rd party domain. Requires expansion and verification.'
            },
            {
                id: 'demo-scam-fee',
                title: 'Upfront Registration Fee Scam',
                category: '🔴 HIGH_RISK',
                badge_class: 'danger',
                url: 'http://fast-track-jobs-portal.xyz/apply?registration-fee=500&pay-now=1',
                description: 'Suspicious TLD, unencrypted HTTP, and parameter requesting upfront application fees.'
            },
            {
                id: 'demo-ip-phish',
                title: 'Direct IP Credential Harvester',
                category: '🔴 HIGH_RISK',
                badge_class: 'danger',
                url: 'http://198.51.100.42/careers/verify-otp?download=job-form.exe',
                description: 'Direct numeric IP host, OTP harvesting parameter, and executable .exe download.'
            }
        ];
    }
}

module.exports = new SecurityService();
