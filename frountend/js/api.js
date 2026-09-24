/**
 * Job Portal — Frontend API & Intelligence Service Layer
 * Centralises all API calls, authentication tokens, notifications, Career GPS, Assessments,
 * Interview Simulator, Project Analyzer, Portfolio Generator, and Global AI Career Assistant.
 */

// Auto-detect base URL: works in local dev, direct static serving, and Vercel production
const API_BASE_URL = (() => {
    const { protocol, hostname, port } = window.location;
    if (port === '5000' || (hostname !== 'localhost' && hostname !== '127.0.0.1')) {
        return `${protocol}//${hostname}${port ? ':' + port : ''}/api`;
    }
    return `${protocol}//${hostname}:5000/api`;
})();

// ── Token / Session helpers ───────────────────────────────────────────────────
const Auth = {
    getToken()          { return localStorage.getItem('jp_token'); },
    getUser()           {
        const u = localStorage.getItem('jp_user');
        try { return u ? JSON.parse(u) : null; } catch { return null; }
    },
    setSession(data)    {
        if (data.token) localStorage.setItem('jp_token', data.token);
        const user = data.user || { id: data.id, full_name: data.full_name, email: data.email, role: data.role };
        if (user.id) localStorage.setItem('jp_user', JSON.stringify(user));
    },
    clearSession()      {
        localStorage.removeItem('jp_token');
        localStorage.removeItem('jp_user');
    },
    isLoggedIn()        { return !!this.getToken(); },
    redirectIfGuest(dest = 'login.html') {
        if (!this.isLoggedIn()) {
            window.location.href = dest + '?redirect=' + encodeURIComponent(window.location.href);
        }
    },
    redirectIfLoggedIn(dest = 'dashboard.html') {
        if (this.isLoggedIn()) { window.location.href = dest; }
    },
};

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
    const token   = Auth.getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
        res = await fetch(API_BASE_URL + path, { ...options, headers });
    } catch (networkErr) {
        throw { status: 0, message: 'Network connection error. Please verify the backend server is running on port 5000.' };
    }

    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) {
        if (res.status === 401 && token && !path.includes('/login') && !path.includes('/register')) {
            Auth.clearSession();
            window.location.href = 'login.html?expired=1';
            return;
        }
        const errorMsg = data.error?.message || data.message || `Request failed (${res.status})`;
        throw { status: res.status, message: errorMsg, code: data.error?.code };
    }

    return data;
}

// ── Auth API ──────────────────────────────────────────────────────────────────
const AuthAPI = {
    login(email, password) {
        return apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    },
    register(full_name, email, password, role) {
        return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ full_name, email, password, role }) });
    },
    me() {
        return apiFetch('/auth/me');
    },
    changePassword(current_password, new_password) {
        return apiFetch('/auth/change-password', { method: 'PUT', body: JSON.stringify({ current_password, new_password }) });
    },
    async logout() {
        await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
        Auth.clearSession();
        window.location.href = 'index.html';
    },
};

// ── Jobs API ──────────────────────────────────────────────────────────────────
const JobsAPI = {
    list(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiFetch('/jobs' + (qs ? '?' + qs : ''));
    },
    get(id) {
        return apiFetch('/jobs/' + id);
    },
    create(data) {
        return apiFetch('/jobs', { method: 'POST', body: JSON.stringify(data) });
    },
    update(id, data) {
        return apiFetch('/jobs/' + id, { method: 'PUT', body: JSON.stringify(data) });
    },
    delete(id) {
        return apiFetch('/jobs/' + id, { method: 'DELETE' });
    },
    featured(limit = 6) {
        return apiFetch('/jobs/featured?limit=' + limit);
    },
    companies() {
        return apiFetch('/jobs/companies');
    },
};

// ── Search API ────────────────────────────────────────────────────────────────
const SearchAPI = {
    search(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiFetch('/search' + (qs ? '?' + qs : ''));
    },
};

// ── Recommendations API ───────────────────────────────────────────────────────
const RecommendationsAPI = {
    list(limit = 6) {
        return apiFetch('/recommendations?limit=' + limit);
    },
    radar() {
        return apiFetch('/recommendations/radar');
    }
};

// ── Applications API ──────────────────────────────────────────────────────────
const ApplicationsAPI = {
    my(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiFetch('/applications/my' + (qs ? '?' + qs : ''));
    },
    forJob(jobId) {
        return apiFetch('/applications/job/' + jobId);
    },
    apply(job_id, cover_letter = '', resume_path = null) {
        return apiFetch('/applications', { method: 'POST', body: JSON.stringify({ job_id, cover_letter, resume_path }) });
    },
    updateStatus(appId, status, notes = '') {
        return apiFetch('/applications/' + appId + '/status', { method: 'PATCH', body: JSON.stringify({ status, notes }) });
    },
    withdraw(id) {
        return apiFetch('/applications/' + id, { method: 'DELETE' });
    },
};

// ── Profile API ───────────────────────────────────────────────────────────────
const ProfileAPI = {
    get() {
        return apiFetch('/profile');
    },
    update(data) {
        return apiFetch('/profile', { method: 'PUT', body: JSON.stringify(data) });
    },
    addSkill(skill_name, proficiency_level = 'intermediate') {
        return apiFetch('/profile/skills', { method: 'POST', body: JSON.stringify({ skill_name, proficiency_level }) });
    },
    removeSkill(id) {
        return apiFetch('/profile/skills/' + id, { method: 'DELETE' });
    },
    addExperience(data) {
        return apiFetch('/profile/experience', { method: 'POST', body: JSON.stringify(data) });
    },
    removeExperience(id) {
        return apiFetch('/profile/experience/' + id, { method: 'DELETE' });
    },
    addEducation(data) {
        return apiFetch('/profile/education', { method: 'POST', body: JSON.stringify(data) });
    },
    removeEducation(id) {
        return apiFetch('/profile/education/' + id, { method: 'DELETE' });
    },
};

// ── Saved Jobs API ────────────────────────────────────────────────────────────
const SavedJobsAPI = {
    list() {
        return apiFetch('/saved-jobs');
    },
    save(job_id) {
        return apiFetch('/saved-jobs', { method: 'POST', body: JSON.stringify({ job_id }) });
    },
    remove(job_id) {
        return apiFetch('/saved-jobs/' + job_id, { method: 'DELETE' });
    },
    check(job_id) {
        return apiFetch('/saved-jobs/check/' + job_id);
    },
};

// ── Notifications API ─────────────────────────────────────────────────────────
const NotificationsAPI = {
    list(page = 1) {
        return apiFetch('/notifications?page=' + page);
    },
    unreadCount() {
        return apiFetch('/notifications/unread/count');
    },
    markRead(id) {
        return apiFetch('/notifications/' + id + '/read', { method: 'PATCH' });
    },
    markAllRead() {
        return apiFetch('/notifications/read-all', { method: 'PATCH' });
    },
    delete(id) {
        return apiFetch('/notifications/' + id, { method: 'DELETE' });
    },
    clearAll() {
        return apiFetch('/notifications/clear-all', { method: 'DELETE' });
    },
};

// ── Career GPS & Intelligence API ─────────────────────────────────────────────
const CareerAPI = {
    getGoal() {
        return apiFetch('/career/goal');
    },
    saveGoal(data) {
        return apiFetch('/career/goal', { method: 'POST', body: JSON.stringify(data) });
    },
    skillGap(data = {}) {
        return apiFetch('/career/skill-gap', { method: 'POST', body: JSON.stringify(data) });
    },
    getRoadmap() {
        return apiFetch('/career/roadmap');
    },
    generateRoadmap(target_role, current_level = 'Entry / Fresher') {
        return apiFetch('/career/roadmap/generate', { method: 'POST', body: JSON.stringify({ target_role, current_level }) });
    },
    updateStage(roadmap_id, stage_index, completed) {
        return apiFetch('/career/roadmap/stage', { method: 'PATCH', body: JSON.stringify({ roadmap_id, stage_index, completed }) });
    },
    jobReadiness() {
        return apiFetch('/career/readiness');
    },
    timeline() {
        return apiFetch('/career/timeline');
    },
    recordEvent(data) {
        return apiFetch('/career/events', { method: 'POST', body: JSON.stringify(data) });
    }
};

// ── Assessments API ───────────────────────────────────────────────────────────
const AssessmentsAPI = {
    list() {
        return apiFetch('/assessments');
    },
    get(id) {
        return apiFetch('/assessments/' + id);
    },
    submit(id, answers) {
        return apiFetch('/assessments/' + id + '/submit', { method: 'POST', body: JSON.stringify({ answers }) });
    },
    myAttempts() {
        return apiFetch('/assessments/my/attempts');
    }
};

// ── Interviews API ────────────────────────────────────────────────────────────
const InterviewsAPI = {
    startSimulation(role_title = 'Full Stack Developer', difficulty = 'mid', interview_type = 'Technical') {
        return apiFetch('/interviews/simulate/start', { method: 'POST', body: JSON.stringify({ role_title, difficulty, interview_type }) });
    },
    answerSimulation(role_title, question, answer, question_index = 0, interview_type = 'Technical') {
        return apiFetch('/interviews/simulate/answer', { method: 'POST', body: JSON.stringify({ role_title, question, answer, question_index, interview_type }) });
    },
    schedule(data) {
        return apiFetch('/interviews/schedule', { method: 'POST', body: JSON.stringify(data) });
    },
    my() {
        return apiFetch('/interviews/my');
    },
    updateStatus(id, status, feedback = '') {
        return apiFetch('/interviews/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status, feedback }) });
    }
};

// ── Portfolio & Project Analyzer API ──────────────────────────────────────────
const PortfolioAPI = {
    listProjects() {
        return apiFetch('/portfolio/projects');
    },
    saveProject(data) {
        return apiFetch('/portfolio/projects', { method: 'POST', body: JSON.stringify(data) });
    },
    deleteProject(id) {
        return apiFetch('/portfolio/projects/' + id, { method: 'DELETE' });
    },
    analyzeProject(title, summary, technologies = []) {
        return apiFetch('/portfolio/analyze-project', { method: 'POST', body: JSON.stringify({ title, summary, technologies }) });
    },
    generate() {
        return apiFetch('/portfolio/generate');
    },
    viewPublic(userId) {
        return apiFetch('/portfolio/view/' + userId);
    }
};

// ── AI Services API ───────────────────────────────────────────────────────────
const AiAPI = {
    analyzeResume(resume_text = '') {
        return apiFetch('/ai/resume-analyzer', { method: 'POST', body: JSON.stringify({ resume_text }) });
    },
    matchScore(job_id, skills = []) {
        return apiFetch('/ai/match-score', { method: 'POST', body: JSON.stringify({ job_id, skills }) });
    },
    generateCoverLetter(job_id, tone = 'professional') {
        return apiFetch('/ai/cover-letter', { method: 'POST', body: JSON.stringify({ job_id, tone }) });
    },
    interviewPrep(job_title = '', job_id = null) {
        return apiFetch('/ai/interview-prep', { method: 'POST', body: JSON.stringify({ job_title, job_id }) });
    },
    optimizeJob(data) {
        return apiFetch('/ai/optimize-job', { method: 'POST', body: JSON.stringify(data) });
    },
    careerGuidance() {
        return apiFetch('/ai/career-guidance');
    },
    chatAssistant(message) {
        return apiFetch('/ai/chat-assistant', { method: 'POST', body: JSON.stringify({ message }) });
    },
    analyzeJD(job_description) {
        return apiFetch('/ai/jd-analyzer', { method: 'POST', body: JSON.stringify({ job_description }) });
    },
    checkSafety(job_id, jobData = {}) {
        return apiFetch('/ai/job-safety', { method: 'POST', body: JSON.stringify({ job_id, ...jobData }) });
    },
    naturalSearch(query) {
        return apiFetch('/ai/natural-search', { method: 'POST', body: JSON.stringify({ query }) });
    }
};

// ── Analytics API ─────────────────────────────────────────────────────────────
const AnalyticsAPI = {
    overview() {
        return apiFetch('/analytics/overview');
    },
};

// ── Admin API ─────────────────────────────────────────────────────────────────
const AdminAPI = {
    overview() {
        return apiFetch('/admin/overview');
    },
    users(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiFetch('/admin/users' + (qs ? '?' + qs : ''));
    },
    banUser(id) {
        return apiFetch('/admin/users/' + id + '/ban', { method: 'PATCH' });
    },
    unbanUser(id) {
        return apiFetch('/admin/users/' + id + '/unban', { method: 'PATCH' });
    },
    setRole(id, role) {
        return apiFetch('/admin/users/' + id + '/role', { method: 'PATCH', body: JSON.stringify({ role }) });
    },
    deleteUser(id) {
        return apiFetch('/admin/users/' + id, { method: 'DELETE' });
    },
    jobs(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiFetch('/admin/jobs' + (qs ? '?' + qs : ''));
    },
    toggleFeature(id) {
        return apiFetch('/admin/jobs/' + id + '/feature', { method: 'PATCH' });
    },
    // Admin Security Center
    securityOverview() {
        return apiFetch('/admin/security/overview');
    },
    securityReports(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiFetch('/admin/security/reports' + (qs ? '?' + qs : ''));
    },
    securityChecks(limit = 20) {
        return apiFetch('/admin/security/checks?limit=' + limit);
    },
    updateReportStatus(id, status, admin_notes = '') {
        return apiFetch('/admin/security/reports/' + id + '/status', {
            method: 'PATCH',
            body: JSON.stringify({ status, admin_notes })
        });
    },
    takeJobSecurityAction(jobId, action, report_id = null, notes = '') {
        return apiFetch('/admin/security/jobs/' + jobId + '/action', {
            method: 'POST',
            body: JSON.stringify({ action, report_id, notes })
        });
    }
};

// ── Security & Web Safety Protection API ──────────────────────────────────────
const SecurityAPI = {
    checkUrl(url, extraData = {}) {
        return apiFetch('/security/check-url', {
            method: 'POST',
            body: JSON.stringify({ url, ...extraData })
        });
    },
    checkJob(id) {
        return apiFetch('/security/check-job/' + id);
    },
    reportJob(data) {
        return apiFetch('/security/report-job', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    getDemoCases() {
        return apiFetch('/security/demo-cases');
    },
    getStats() {
        return apiFetch('/security/stats');
    }
};

// ── Dashboard API ─────────────────────────────────────────────────────────────
const DashboardAPI = {
    overview() {
        return apiFetch('/dashboard/overview');
    },
};

// ── Formatting Utilities ──────────────────────────────────────────────────────
function formatSalary(min, max) {
    const fmt = v => {
        if (!v) return null;
        const n = parseFloat(v);
        if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} LPA`;
        return `₹${n.toLocaleString('en-IN')}`;
    };
    const fMin = fmt(min);
    const fMax = fmt(max);
    if (fMin && fMax) return `${fMin} – ${fMax}`;
    if (fMin) return `From ${fMin}`;
    if (fMax) return `Up to ${fMax}`;
    return 'Salary Negotiable';
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'Just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── Toast Notification System ─────────────────────────────────────────────────
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText =
            'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;width:320px;';
        document.body.appendChild(container);
    }

    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    const icons  = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

    const toast = document.createElement('div');
    toast.style.cssText =
        `background:#111827;color:#fff;padding:12px 16px;border-radius:10px;
         border-left:4px solid ${colors[type] || colors.info};
         font-size:13px;font-family:Inter,sans-serif;display:flex;align-items:center;gap:10px;
         box-shadow:0 10px 30px rgba(0,0,0,.35);
         opacity:0;transform:translateX(30px);transition:.25s cubic-bezier(0.16,1,0.3,1);`;

    toast.innerHTML = `<span style="font-size:14px;font-weight:bold;color:${colors[type]||colors.info}">${icons[type]||icons.info}</span><span>${escHtml(message)}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity   = '1';
        toast.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        toast.style.opacity   = '0';
        toast.style.transform = 'translateX(30px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ── Global AI Career Assistant Floating Widget ────────────────────────────────
function initAIChatWidget() {
    if (document.getElementById('aiAssistantDrawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'aiAssistantDrawer';
    drawer.style.cssText = `
        position: fixed; bottom: 90px; right: 24px; width: 380px; max-width: calc(100vw - 32px); height: 520px;
        background: #fff; border-radius: 20px; box-shadow: 0 20px 50px rgba(15,23,42,.2);
        border: 1px solid #e0e7ff; z-index: 99990; display: none; flex-direction: column; overflow: hidden;
        font-family: Inter, sans-serif; transition: transform .25s ease, opacity .25s ease;
    `;

    drawer.innerHTML = `
        <div style="background: linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff; padding: 16px 20px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:34px; height:34px; border-radius:10px; background:rgba(255,255,255,.2); display:grid; place-items:center; font-size:16px;">✨</div>
                <div>
                    <strong style="font-size:14px; display:block;">Career AI Assistant</strong>
                    <small style="opacity:.85; font-size:11px;">Real-time Career Intelligence</small>
                </div>
            </div>
            <button id="closeAIChatBtn" style="border:none; background:none; color:#fff; font-size:20px; cursor:pointer; opacity:.85;">&times;</button>
        </div>
        <div id="aiChatMessages" style="flex:1; padding: 16px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; font-size:13px; background:#f8fafc;">
            <div style="background:#eef2ff; color:#374151; padding:12px 14px; border-radius:14px; max-width:85%; border:1px solid #e0e7ff; line-height:1.5;">
                Hello! 👋 I am your <strong>AI Career Assistant</strong>. Ask me about roadmaps, resume tips, interview prep, skill gaps, or finding matching jobs!
            </div>
        </div>
        <div style="padding:10px 14px; border-top:1px solid #e5e7eb; background:#fff; display:flex; gap:8px;">
            <input type="text" id="aiChatInput" placeholder="Ask career advice, resume tips…" style="flex:1; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; font-size:13px; outline:none;" />
            <button id="aiChatSendBtn" style="border:none; border-radius:10px; background:#4f46e5; color:#fff; padding:0 16px; font-weight:700; cursor:pointer;">
                <i class="fa-solid fa-paper-plane"></i>
            </button>
        </div>
    `;

    document.body.appendChild(drawer);

    // Floating Button
    const triggerBtn = document.createElement('button');
    triggerBtn.id = 'aiChatTriggerBtn';
    triggerBtn.title = 'Open AI Career Assistant';
    triggerBtn.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 99989; width: 56px; height: 56px; border-radius: 50%;
        background: linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff; border:none; box-shadow: 0 10px 25px rgba(79,70,229,.4);
        cursor: pointer; display: grid; place-items: center; font-size: 20px; transition: transform .2s ease;
    `;
    triggerBtn.innerHTML = '<i class="fa-solid fa-sparkles"></i>';
    triggerBtn.addEventListener('mouseenter', () => triggerBtn.style.transform = 'scale(1.08)');
    triggerBtn.addEventListener('mouseleave', () => triggerBtn.style.transform = 'scale(1)');

    triggerBtn.addEventListener('click', () => {
        const isHidden = drawer.style.display === 'none' || !drawer.style.display;
        drawer.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            document.getElementById('aiChatInput').focus();
        }
    });

    document.getElementById('closeAIChatBtn').addEventListener('click', () => {
        drawer.style.display = 'none';
    });

    const sendMsg = async () => {
        const input = document.getElementById('aiChatInput');
        const text = input.value.trim();
        if (!text) return;

        const messagesBox = document.getElementById('aiChatMessages');
        
        // Render user message
        const userDiv = document.createElement('div');
        userDiv.style.cssText = 'background:#4f46e5; color:#fff; padding:10px 14px; border-radius:14px; align-self:flex-end; max-width:80%; line-height:1.4;';
        userDiv.textContent = text;
        messagesBox.appendChild(userDiv);
        input.value = '';
        messagesBox.scrollTop = messagesBox.scrollHeight;

        // Render typing indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'aiTyping';
        loadingDiv.style.cssText = 'background:#f1f5f9; color:#64748b; padding:8px 12px; border-radius:10px; align-self:flex-start; font-size:12px;';
        loadingDiv.textContent = 'AI is thinking…';
        messagesBox.appendChild(loadingDiv);
        messagesBox.scrollTop = messagesBox.scrollHeight;

        try {
            const res = await AiAPI.chatAssistant(text);
            loadingDiv.remove();

            const botDiv = document.createElement('div');
            botDiv.style.cssText = 'background:#fff; color:#1e293b; padding:12px 14px; border-radius:14px; border:1px solid #e2e8f0; align-self:flex-start; max-width:88%; line-height:1.5;';
            botDiv.innerHTML = escHtml(res.data.reply).replace(/\n/g, '<br>');

            if (res.data.suggested_actions && res.data.suggested_actions.length > 0) {
                const actionsDiv = document.createElement('div');
                actionsDiv.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; margin-top:10px;';
                res.data.suggested_actions.forEach(act => {
                    const pill = document.createElement('button');
                    pill.style.cssText = 'padding:4px 10px; font-size:11px; background:#eef2ff; color:#4f46e5; border:1px solid #c7d2fe; border-radius:12px; cursor:pointer; font-weight:600;';
                    pill.textContent = act;
                    pill.onclick = () => {
                        if (act.includes('Career GPS') || act.includes('Skill Gap') || act.includes('Assessment')) {
                            window.location.href = 'career.html';
                        } else if (act.includes('Jobs')) {
                            window.location.href = 'jobs.html';
                        } else {
                            input.value = act;
                            sendMsg();
                        }
                    };
                    actionsDiv.appendChild(pill);
                });
                botDiv.appendChild(actionsDiv);
            }

            messagesBox.appendChild(botDiv);
            messagesBox.scrollTop = messagesBox.scrollHeight;
        } catch (err) {
            loadingDiv.textContent = 'Could not retrieve AI response. Please try again.';
        }
    };

    document.getElementById('aiChatSendBtn').addEventListener('click', sendMsg);
    document.getElementById('aiChatInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') sendMsg();
    });

    document.body.appendChild(triggerBtn);
}

// ── Navbar: Authenticated user menu + notifications ───────────────────────────
async function initNavbar() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    const user = Auth.getUser();
    if (!user) return;

    let unreadCount = 0;
    try {
        const notifRes = await NotificationsAPI.unreadCount();
        unreadCount = notifRes.data?.unread_count || 0;
    } catch { /* silent */ }

    navActions.innerHTML = `
        <div style="position:relative;display:flex;align-items:center;gap:10px;">
            <!-- Career AI Intelligence Link -->
            <a href="career.html" style="
                text-decoration:none;color:#4f46e5;font-size:12px;font-weight:700;
                display:inline-flex;align-items:center;gap:6px;padding:7px 12px;
                border-radius:8px;background:#eef2ff;border:1px solid #c7d2fe;transition:.2s;"
                onmouseover="this.style.background='#e0e7ff'"
                onmouseout="this.style.background='#eef2ff'">
                <i class="fa-solid fa-sparkles"></i> AI Career GPS
            </a>

            <!-- Notification Bell -->
            <a href="dashboard.html#notifications" title="Notifications" style="
                position:relative;text-decoration:none;color:#6b7280;font-size:16px;
                width:38px;height:38px;border-radius:9px;border:1px solid #e5e7eb;
                display:grid;place-items:center;background:#fff;transition:.2s;">
                <i class="fa-regular fa-bell"></i>
                ${unreadCount > 0 ? `
                <span style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;
                             font-size:10px;font-weight:800;width:18px;height:18px;border-radius:50%;
                             display:grid;place-items:center;border:2px solid #fff;">${unreadCount > 9 ? '9+' : unreadCount}</span>` : ''}
            </a>

            <!-- Dashboard Button -->
            <a href="dashboard.html" style="
                text-decoration:none;color:#374151;font-size:13px;font-weight:600;
                display:flex;align-items:center;gap:7px;padding:8px 14px;
                border-radius:9px;border:1px solid #e5e7eb;background:#fff;transition:.2s;"
                onmouseover="this.style.borderColor='#c7d2fe';this.style.background='#eef2ff'"
                onmouseout="this.style.borderColor='#e5e7eb';this.style.background='#fff'">
                <i class="fa-solid fa-gauge" style="color:#4f46e5"></i>
                Dashboard
            </a>

            <!-- Logout -->
            <button onclick="AuthAPI.logout()" title="Logout" style="
                border:none;background:none;color:#6b7280;font-size:13px;font-weight:600;
                cursor:pointer;padding:8px 10px;border-radius:9px;transition:.2s;"
                onmouseover="this.style.background='#fee2e2';this.style.color='#dc2626'"
                onmouseout="this.style.background='none';this.style.color='#6b7280'">
                <i class="fa-solid fa-right-from-bracket"></i>
            </button>
        </div>`;
}

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initAIChatWidget();

    // Mobile menu toggle
    const mobileMenu = document.getElementById('mobileMenu');
    const navLinks   = document.querySelector('.nav-links');
    if (mobileMenu && navLinks) {
        mobileMenu.addEventListener('click', () => navLinks.classList.toggle('show'));
        navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('show')));
    }
});
