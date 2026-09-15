/**
 * Job Portal — Frontend API Helper
 * Centralises all API calls. Change API_BASE_URL once here and it applies everywhere.
 */

// Auto-detect base URL: works in local dev and in production
const API_BASE_URL = (() => {
    const { protocol, hostname, port } = window.location;
    // Vercel / production — same origin
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return `${protocol}//${hostname}/api`;
    }
    // Local dev — backend runs on port 5000
    const devPort = '5000';
    return `${protocol}//${hostname}:${devPort}/api`;
})();

// ── Token / Session helpers ───────────────────────────────────────────────────
const Auth = {
    getToken()          { return localStorage.getItem('jp_token'); },
    getUser()           {
        const u = localStorage.getItem('jp_user');
        try { return u ? JSON.parse(u) : null; } catch { return null; }
    },
    setSession(data)    {
        // data can be { token, user } or { token, id, full_name, email, role }
        if (data.token)  localStorage.setItem('jp_token', data.token);
        const user = data.user || { id: data.id, full_name: data.full_name, email: data.email, role: data.role };
        if (user.id)     localStorage.setItem('jp_user', JSON.stringify(user));
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
        throw { status: 0, message: 'Network error — check your connection.' };
    }

    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) {
        // Auto-logout on expired / invalid token
        if (res.status === 401 && token) {
            Auth.clearSession();
            window.location.href = 'login.html';
            return;
        }
        throw { status: res.status, message: data.message || `Request failed (${res.status})` };
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

// ── Applications API ──────────────────────────────────────────────────────────
const ApplicationsAPI = {
    my(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiFetch('/applications/my' + (qs ? '?' + qs : ''));
    },
    forJob(jobId) {
        return apiFetch('/applications/job/' + jobId);
    },
    apply(job_id, cover_letter = '') {
        return apiFetch('/applications', { method: 'POST', body: JSON.stringify({ job_id, cover_letter }) });
    },
    updateStatus(appId, status) {
        return apiFetch('/applications/' + appId + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
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

// ── Dashboard API ─────────────────────────────────────────────────────────────
const DashboardAPI = {
    overview() {
        return apiFetch('/dashboard/overview');
    },
};

// ── Utility: format salary ────────────────────────────────────────────────────
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
    return 'Not disclosed';
}

// ── Utility: relative time ────────────────────────────────────────────────────
function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'Just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Utility: escape HTML ──────────────────────────────────────────────────────
function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── Toast (global, used by all pages) ────────────────────────────────────────
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText =
            'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;width:300px;';
        document.body.appendChild(container);
    }

    const colors = { success: '#16a34a', error: '#dc2626', warning: '#d97706', info: '#2563eb' };
    const icons  = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

    const toast = document.createElement('div');
    toast.style.cssText =
        `background:#111827;color:#fff;padding:13px 16px;border-radius:10px;
         border-left:4px solid ${colors[type] || colors.info};
         font-size:13px;display:flex;align-items:center;gap:10px;
         box-shadow:0 10px 30px rgba(0,0,0,.25);
         opacity:0;transform:translateX(40px);transition:.3s;`;
    toast.innerHTML = `<span style="font-size:15px">${icons[type] || icons.info}</span><span>${escHtml(message)}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity  = '1';
        toast.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        toast.style.opacity   = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 350);
    }, 4000);
}

// ── Navbar: swap login/register buttons for user menu when logged in ──────────
function initNavbar() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    const user = Auth.getUser();
    if (!user) return; // not logged in — keep default login/register buttons

    navActions.innerHTML = `
        <a href="dashboard.html" style="
            text-decoration:none;color:#374151;font-size:13px;font-weight:600;
            display:flex;align-items:center;gap:7px;padding:8px 14px;
            border-radius:9px;border:1px solid #e5e7eb;background:#fff;transition:.2s;"
            onmouseover="this.style.borderColor='#c7d2fe';this.style.background='#eef2ff'"
            onmouseout="this.style.borderColor='#e5e7eb';this.style.background='#fff'">
            <i class="fa-solid fa-gauge" style="color:#4f46e5"></i>
            Dashboard
        </a>
        <button onclick="AuthAPI.logout()" style="
            border:none;background:none;color:#6b7280;font-size:13px;font-weight:600;
            cursor:pointer;padding:8px 12px;border-radius:9px;transition:.2s;"
            onmouseover="this.style.background='#f3f4f6'"
            onmouseout="this.style.background='none'">
            <i class="fa-solid fa-right-from-bracket"></i> Logout
        </button>`;
}

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();

    // Mobile menu toggle
    const mobileMenu = document.getElementById('mobileMenu');
    const navLinks   = document.querySelector('.nav-links');
    if (mobileMenu && navLinks) {
        mobileMenu.addEventListener('click', () => {
            navLinks.classList.toggle('show');
        });
        // Close on nav link click
        navLinks.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => navLinks.classList.remove('show'));
        });
    }
});
