/* =========================================================
JOB PORTAL - DASHBOARD.JS
Advanced Dashboard Controller
Supports:

* Job Seeker Dashboard
* Recruiter Dashboard
* Statistics
* Applications
* Saved Jobs
* Recommended Jobs
* Profile Completion
* Notifications
* Charts
  ========================================================= */

"use strict";

/* =========================================================
CONFIGURATION
========================================================= */

const DASHBOARD_CONFIG = {
    dashboardEndpoint:      '/api/dashboard/overview',
    jobsEndpoint:           '/api/jobs',
    applicationsEndpoint:   '/api/applications/my',
    profileEndpoint:        '/api/profile',
    notificationsEndpoint:  '/api/notifications',
    refreshInterval:        60000,
    maxRecentApplications:  5,
    maxRecommendedJobs:     6,
    maxRecentJobs:          5
};

/* =========================================================
DASHBOARD STATE
========================================================= */

const dashboardState = {

```
user: null,

role: "job_seeker",

statistics: {},

applications: [],

savedJobs: [],

recommendedJobs: [],

recentJobs: [],

notifications: [],

profile: null,

loading: false,

initialized: false,

refreshTimer: null
```

};

/* =========================================================
DOM READY
========================================================= */

document.addEventListener(
"DOMContentLoaded",
() => {

```
    initializeDashboard();

}
```

);

/* =========================================================
INITIALIZE DASHBOARD
========================================================= */

async function initializeDashboard() {

```
/*
 * Get logged-in user.
 */

dashboardState.user =
    typeof getCurrentUser === "function"
        ? getCurrentUser()
        : null;


/*
 * Dashboard requires authentication.
 */

if (!dashboardState.user) {

    handleDashboardAuthentication();

    return;
}


dashboardState.role =
    dashboardState.user.role ||
    "job_seeker";


dashboardState.initialized =
    true;


/*
 * Update common UI immediately.
 */

renderUserInformation();

renderRoleBasedUI();

initializeDashboardEvents();

initializeDashboardTabs();

initializeQuickActions();


/*
 * Load dashboard data.
 */

await loadDashboard();


/*
 * Auto-refresh dashboard.
 */

startDashboardRefresh();
```

}

/* =========================================================
AUTHENTICATION
========================================================= */

function handleDashboardAuthentication() {

```
if (
    typeof showToast ===
    "function"
) {

    showToast(
        "Please login to access your dashboard.",
        "warning"
    );
}


setTimeout(() => {

    window.location.href =
        `login.html?redirect=${encodeURIComponent(
            window.location.href
        )}`;

}, 700);
```

}

/* =========================================================
LOAD DASHBOARD
========================================================= */

async function loadDashboard() {
    setDashboardLoading(true);

    try {
        const token = (typeof Auth !== 'undefined') ? Auth.getToken() : localStorage.getItem('jp_token');
        const headers = { 'Accept': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) };

        // Load jobs, applications and profile in parallel
        const [jobsRes, appsRes, profileRes] = await Promise.allSettled([
            fetch('/api/jobs?per_page=20', { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('/api/applications/my', { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('/api/profile',          { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);

        if (jobsRes.value)    dashboardState.recentJobs    = jobsRes.value.data    || [];
        if (appsRes.value)    dashboardState.applications  = appsRes.value.data    || [];
        if (profileRes.value) dashboardState.profile       = profileRes.value.data || null;

        calculateLocalStatistics();
        generateLocalRecommendations();
        renderDashboard();

    } catch (error) {
        console.error('Dashboard loading error:', error);
        showDashboardError('Unable to load dashboard data.');
    } finally {
        setDashboardLoading(false);
    }
}

/* =========================================================
PROCESS DASHBOARD DATA
========================================================= */

function processDashboardData(
data
) {

```
if (!data) return;


dashboardState.statistics =
    data.statistics ||
    data.stats ||
    {};


dashboardState.applications =
    data.applications ||
    data.recent_applications ||
    [];


dashboardState.savedJobs =
    data.saved_jobs ||
    data.savedJobs ||
    [];


dashboardState.recommendedJobs =
    data.recommended_jobs ||
    data.recommendedJobs ||
    [];


dashboardState.recentJobs =
    data.recent_jobs ||
    data.recentJobs ||
    [];


dashboardState.notifications =
    data.notifications ||
    [];


dashboardState.profile =
    data.profile ||
    null;


if (data.user) {

    dashboardState.user = {
        ...dashboardState.user,
        ...data.user
    };
}


renderDashboard();
```

}

/* =========================================================
FALLBACK DATA LOADING
========================================================= */

async function loadDashboardFallback() {

```
const requests = [];


/*
 * Applications.
 */

requests.push(
    fetch(
        DASHBOARD_CONFIG.applicationsEndpoint,
        {
            credentials: "include"
        }
    )
        .then(
            response =>
                response.ok
                    ? response.json()
                    : null
        )
        .catch(
            () => null
        )
);


/*
 * Jobs.
 */

requests.push(
    fetch(
        `${DASHBOARD_CONFIG.jobsEndpoint}?limit=20`,
        {
            credentials: "include"
        }
    )
        .then(
            response =>
                response.ok
                    ? response.json()
                    : null
        )
        .catch(
            () => null
        )
);


/*
 * Profile.
 */

requests.push(
    fetch(
        DASHBOARD_CONFIG.profileEndpoint,
        {
            credentials: "include"
        }
    )
        .then(
            response =>
                response.ok
                    ? response.json()
                    : null
        )
        .catch(
            () => null
        )
);


const [
    applicationsData,
    jobsData,
    profileData
] =
    await Promise.all(requests);


/*
 * Applications.
 */

if (applicationsData) {

    dashboardState.applications =
        applicationsData.applications ||
        applicationsData.data ||
        (
            Array.isArray(
                applicationsData
            )
                ? applicationsData
                : []
        );
}


/*
 * Jobs.
 */

if (jobsData) {

    dashboardState.recentJobs =
        jobsData.jobs ||
        jobsData.data ||
        (
            Array.isArray(
                jobsData
            )
                ? jobsData
                : []
        );
}


/*
 * Profile.
 */

if (profileData) {

    dashboardState.profile =
        profileData.profile ||
        profileData.data ||
        profileData;
}


calculateLocalStatistics();

generateLocalRecommendations();

renderDashboard();
```

}

/* =========================================================
RENDER DASHBOARD
========================================================= */

function renderDashboard() {

```
renderUserInformation();

renderStatistics();

renderRecentApplications();

renderSavedJobs();

renderRecommendedJobs();

renderRecentJobs();

renderNotifications();

renderProfileCompletion();

renderDashboardCharts();

updateQuickStats();
```

}

/* =========================================================
USER INFORMATION
========================================================= */

function renderUserInformation() {

```
const user =
    dashboardState.user;


if (!user) return;


const name =
    user.name ||
    user.username ||
    "User";


const email =
    user.email ||
    "";


const avatar =
    user.avatar ||
    user.profile_image ||
    "";


document.querySelectorAll(
    "[data-dashboard-user-name], #dashboardUserName, .dashboard-user-name"
).forEach(element => {

    element.textContent =
        name;

});


document.querySelectorAll(
    "[data-dashboard-user-email], #dashboardUserEmail"
).forEach(element => {

    element.textContent =
        email;

});


document.querySelectorAll(
    "[data-user-role], #dashboardUserRole"
).forEach(element => {

    element.textContent =
        formatRole(
            dashboardState.role
        );

});


document.querySelectorAll(
    ".dashboard-avatar, [data-dashboard-avatar]"
).forEach(element => {

    if (
        element.tagName === "IMG" &&
        avatar
    ) {

        element.src =
            avatar;

        element.alt =
            name;

    } else {

        element.textContent =
            getInitials(name);
    }

});
```

}

/* =========================================================
ROLE BASED UI
========================================================= */

function renderRoleBasedUI() {

```
const role =
    dashboardState.role;


document.querySelectorAll(
    "[data-role]"
).forEach(element => {

    const allowedRoles =
        element.dataset.role
            .split(",")
            .map(
                value =>
                    value.trim()
            );


    element.style.display =
        allowedRoles.includes(role)
            ? ""
            : "none";

});


/*
 * Dashboard title.
 */

const title =
    document.querySelector(
        "#dashboardTitle, .dashboard-title"
    );


if (title) {

    if (role === "recruiter") {

        title.textContent =
            "Recruiter Dashboard";

    } else if (role === "admin") {

        title.textContent =
            "Admin Dashboard";

    } else {

        title.textContent =
            "Job Seeker Dashboard";
    }
}
```

}

/* =========================================================
STATISTICS
========================================================= */

function renderStatistics() {

```
const stats =
    dashboardState.statistics;


const values = {

    totalJobs:
        stats.total_jobs ??
        stats.totalJobs ??
        dashboardState.recentJobs.length,

    applications:
        stats.applications ??
        stats.total_applications ??
        dashboardState.applications.length,

    shortlisted:
        stats.shortlisted ??
        stats.shortlisted_applications ??
        countApplicationsByStatus(
            "shortlisted"
        ),

    interviews:
        stats.interviews ??
        stats.interview_count ??
        countApplicationsByStatus(
            "interview"
        ),

    hired:
        stats.hired ??
        stats.hired_count ??
        countApplicationsByStatus(
            "hired"
        ),

    rejected:
        stats.rejected ??
        stats.rejected_count ??
        countApplicationsByStatus(
            "rejected"
        ),

    saved:
        stats.saved ??
        stats.saved_jobs ??
        dashboardState.savedJobs.length

};


const selectors = {

    totalJobs: [
        "#totalJobs",
        "[data-stat='total-jobs']"
    ],

    applications: [
        "#totalApplications",
        "[data-stat='applications']"
    ],

    shortlisted: [
        "#shortlistedApplications",
        "[data-stat='shortlisted']"
    ],

    interviews: [
        "#interviews",
        "[data-stat='interviews']"
    ],

    hired: [
        "#hiredCandidates",
        "[data-stat='hired']"
    ],

    rejected: [
        "#rejectedApplications",
        "[data-stat='rejected']"
    ],

    saved: [
        "#savedJobs",
        "[data-stat='saved']"
    ]

};


Object.entries(values)
    .forEach(
        ([key, value]) => {

            selectors[key]
                ?.forEach(
                    selector => {

                        document
                            .querySelectorAll(
                                selector
                            )
                            .forEach(
                                element => {

                                    animateNumber(
                                        element,
                                        Number(
                                            value
                                        ) || 0
                                    );

                                }
                            );

                    }
                );
        }
    );
```

}

/* =========================================================
RECENT APPLICATIONS
========================================================= */

function renderRecentApplications() {

```
const container =
    document.querySelector(
        "#recentApplications, .recent-applications, [data-recent-applications]"
    );


if (!container) return;


const applications =
    dashboardState.applications
        .slice(
            0,
            DASHBOARD_CONFIG.maxRecentApplications
        );


if (!applications.length) {

    container.innerHTML = `
        <div class="dashboard-empty">
            <div class="empty-icon">📄</div>
            <h4>No applications yet</h4>
            <p>
                Start applying for jobs that match your skills.
            </p>
            <a
                href="jobs.html"
                class="btn btn-primary"
            >
                Find Jobs
            </a>
        </div>
    `;

    return;
}


container.innerHTML =
    applications
        .map(
            application =>
                createApplicationRow(
                    application
                )
        )
        .join("");
```

}

/* =========================================================
APPLICATION ROW
========================================================= */

function createApplicationRow(
application
) {

```
const jobTitle =
    escapeHTML(
        application.job_title ||
        application.title ||
        "Job"
    );


const company =
    escapeHTML(
        application.company_name ||
        application.company ||
        "Company"
    );


const status =
    String(
        application.status ||
        "pending"
    ).toLowerCase();


const date =
    formatDate(
        application.applied_at ||
        application.created_at
    );


const jobId =
    application.job_id ||
    application.id ||
    "";


return `
    <div
        class="application-row"
        data-application-id="${escapeHTML(
            application.id || ""
        )}"
    >

        <div class="application-info">

            <div class="application-icon">
                💼
            </div>

            <div>

                <h4>
                    ${jobTitle}
                </h4>

                <p>
                    ${company}
                </p>

            </div>

        </div>


        <span
            class="application-status status-${escapeHTML(
                status
            )}"
        >
            ${formatStatus(status)}
        </span>


        <span class="application-date">
            ${date}
        </span>


        ${
            jobId
                ? `
                    <a
                        href="job-details.html?id=${encodeURIComponent(
                            jobId
                        )}"
                        class="application-view"
                    >
                        View
                    </a>
                  `
                : ""
        }

    </div>
`;
```

}

/* =========================================================
SAVED JOBS
========================================================= */

function renderSavedJobs() {

```
const container =
    document.querySelector(
        "#savedJobsList, .saved-jobs-list, [data-saved-jobs]"
    );


if (!container) return;


let savedJobs =
    dashboardState.savedJobs;


/*
 * If backend did not return saved jobs,
 * read local saved job IDs.
 */

if (
    !savedJobs.length &&
    typeof getSavedJobs === "function"
) {

    const savedIds =
        getSavedJobs();


    savedJobs =
        dashboardState.recentJobs
            .filter(
                job =>
                    savedIds.includes(
                        String(
                            job.id
                        )
                    )
            );
}


if (!savedJobs.length) {

    container.innerHTML = `
        <div class="dashboard-empty">
            <div class="empty-icon">♡</div>
            <h4>No saved jobs</h4>
            <p>
                Save jobs to quickly access them later.
            </p>
        </div>
    `;

    return;
}


container.innerHTML =
    savedJobs
        .slice(0, 5)
        .map(
            job =>
                createMiniJobCard(
                    job
                )
        )
        .join("");
```

}

/* =========================================================
RECOMMENDED JOBS
========================================================= */

function renderRecommendedJobs() {

```
const container =
    document.querySelector(
        "#recommendedJobs, .recommended-jobs, [data-recommended-jobs]"
    );


if (!container) return;


const jobs =
    dashboardState.recommendedJobs
        .slice(
            0,
            DASHBOARD_CONFIG.maxRecommendedJobs
        );


if (!jobs.length) {

    container.innerHTML = `
        <div class="dashboard-empty">
            <div class="empty-icon">✨</div>
            <h4>No recommendations yet</h4>
            <p>
                Complete your profile to receive better job recommendations.
            </p>
            <a
                href="profile.html"
                class="btn btn-primary"
            >
                Complete Profile
            </a>
        </div>
    `;

    return;
}


container.innerHTML =
    jobs
        .map(
            job =>
                createMiniJobCard(
                    job,
                    true
                )
        )
        .join("");
```

}

/* =========================================================
MINI JOB CARD
========================================================= */

function createMiniJobCard(
job,
showMatch = false
) {

```
const id =
    job.id ||
    job.job_id;


const title =
    escapeHTML(
        job.title ||
        job.job_title ||
        "Job"
    );


const company =
    escapeHTML(
        job.company_name ||
        job.company ||
        "Company"
    );


const location =
    escapeHTML(
        job.location ||
        "Remote"
    );


const type =
    escapeHTML(
        job.job_type ||
        job.type ||
        "Full Time"
    );


const match =
    Number(
        job.match_score ||
        job.match ||
        0
    );


return `
    <article
        class="mini-job-card"
        data-job-id="${escapeHTML(id)}"
    >

        <div class="mini-job-logo">
            ${getCompanyInitial(company)}
        </div>


        <div class="mini-job-content">

            <h4>
                <a
                    href="job-details.html?id=${encodeURIComponent(
                        id
                    )}"
                >
                    ${title}
                </a>
            </h4>

            <p>
                ${company}
            </p>

            <div class="mini-job-meta">

                <span>
                    📍 ${location}
                </span>

                <span>
                    💼 ${type}
                </span>

            </div>

        </div>


        ${
            showMatch && match
                ? `
                    <div class="job-match-score">
                        ${match}%
                        <small>match</small>
                    </div>
                  `
                : ""
        }

    </article>
`;
```

}

/* =========================================================
RECENT JOBS
========================================================= */

function renderRecentJobs() {

```
const container =
    document.querySelector(
        "#recentJobs, .recent-jobs, [data-recent-jobs]"
    );


if (!container) return;


const jobs =
    dashboardState.recentJobs
        .slice(
            0,
            DASHBOARD_CONFIG.maxRecentJobs
        );


if (!jobs.length) {

    container.innerHTML = `
        <div class="dashboard-empty">
            <h4>No jobs available</h4>
            <a href="jobs.html">
                Browse Jobs
            </a>
        </div>
    `;

    return;
}


container.innerHTML =
    jobs
        .map(
            job =>
                createMiniJobCard(
                    job
                )
        )
        .join("");
```

}

/* =========================================================
NOTIFICATIONS
========================================================= */

function renderNotifications() {

```
const container =
    document.querySelector(
        "#notificationsList, .notifications-list, [data-notifications]"
    );


if (!container) return;


const notifications =
    dashboardState.notifications;


if (!notifications.length) {

    container.innerHTML = `
        <div class="notification-empty">
            No new notifications.
        </div>
    `;

    updateNotificationBadge(0);

    return;
}


const unread =
    notifications.filter(
        notification =>
            !notification.is_read &&
            !notification.read
    ).length;


updateNotificationBadge(
    unread
);


container.innerHTML =
    notifications
        .slice(0, 10)
        .map(
            notification =>
                createNotification(
                    notification
                )
        )
        .join("");
```

}

/* =========================================================
NOTIFICATION ITEM
========================================================= */

function createNotification(
notification
) {

```
const title =
    escapeHTML(
        notification.title ||
        "Notification"
    );


const message =
    escapeHTML(
        notification.message ||
        notification.description ||
        ""
    );


const date =
    formatDate(
        notification.created_at ||
        notification.date
    );


const unread =
    !notification.is_read &&
    !notification.read;


return `
    <div
        class="notification-item ${
            unread
                ? "unread"
                : ""
        }"
        data-notification-id="${
            escapeHTML(
                notification.id || ""
            )
        }"
    >

        <div class="notification-icon">
            🔔
        </div>

        <div class="notification-content">

            <strong>
                ${title}
            </strong>

            <p>
                ${message}
            </p>

            <small>
                ${date}
            </small>

        </div>

    </div>
`;
```

}

/* =========================================================
NOTIFICATION BADGE
========================================================= */

function updateNotificationBadge(
count
) {

```
document.querySelectorAll(
    "#notificationBadge, .notification-badge, [data-notification-count]"
).forEach(element => {

    element.textContent =
        count;


    element.style.display =
        count > 0
            ? ""
            : "none";

});
```

}

/* =========================================================
PROFILE COMPLETION
========================================================= */

function renderProfileCompletion() {

```
const profile =
    dashboardState.profile ||
    dashboardState.user;


if (!profile) return;


const fields = [

    "name",

    "email",

    "phone",

    "location",

    "skills",

    "bio",

    "education",

    "experience",

    "resume"

];


let completed = 0;


fields.forEach(field => {

    const value =
        profile[field];


    if (
        value &&
        (
            Array.isArray(value)
                ? value.length > 0
                : String(value).trim().length > 0
        )
    ) {

        completed++;
    }
});


const percentage =
    Math.round(
        (
            completed /
            fields.length
        ) * 100
    );


document.querySelectorAll(
    "#profileCompletion, [data-profile-completion]"
).forEach(element => {

    element.textContent =
        `${percentage}%`;

});


document.querySelectorAll(
    ".profile-progress-bar, [data-profile-progress]"
).forEach(element => {

    element.style.width =
        `${percentage}%`;

});


document.querySelectorAll(
    ".profile-progress"
).forEach(element => {

    element.setAttribute(
        "aria-valuenow",
        percentage
    );

});


const message =
    document.querySelector(
        "#profileCompletionMessage"
    );


if (message) {

    if (percentage >= 90) {

        message.textContent =
            "Your profile is excellent!";

    } else if (percentage >= 70) {

        message.textContent =
            "Your profile is looking good.";

    } else {

        message.textContent =
            "Complete your profile to improve your job matches.";
    }
}
```

}

/* =========================================================
DASHBOARD CHARTS
========================================================= */

function renderDashboardCharts() {

```
/*
 * Use Chart.js if it is loaded.
 */

if (
    typeof Chart ===
    "undefined"
) {

    return;
}


renderApplicationChart();

renderApplicationStatusChart();
```

}

/* =========================================================
APPLICATION CHART
========================================================= */

function renderApplicationChart() {

```
const canvas =
    document.querySelector(
        "#applicationChart"
    );


if (!canvas) return;


if (
    canvas._chartInstance
) {

    canvas._chartInstance.destroy();
}


const monthlyData =
    generateMonthlyApplicationData();


canvas._chartInstance =
    new Chart(
        canvas,
        {
            type: "line",

            data: {

                labels:
                    monthlyData.labels,

                datasets: [
                    {
                        label:
                            "Applications",

                        data:
                            monthlyData.values,

                        tension:
                            0.4,

                        fill:
                            true
                    }
                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio:
                    false,

                plugins: {

                    legend: {
                        display: false
                    }

                },

                scales: {

                    y: {
                        beginAtZero: true,

                        ticks: {
                            precision: 0
                        }
                    }

                }
            }
        }
    );
```

}

/* =========================================================
APPLICATION STATUS CHART
========================================================= */

function renderApplicationStatusChart() {

```
const canvas =
    document.querySelector(
        "#applicationStatusChart"
    );


if (!canvas) return;


if (
    canvas._chartInstance
) {

    canvas._chartInstance.destroy();
}


const statuses = {

    Pending:
        countApplicationsByStatus(
            "pending"
        ),

    Shortlisted:
        countApplicationsByStatus(
            "shortlisted"
        ),

    Interview:
        countApplicationsByStatus(
            "interview"
        ),

    Hired:
        countApplicationsByStatus(
            "hired"
        ),

    Rejected:
        countApplicationsByStatus(
            "rejected"
        )

};


canvas._chartInstance =
    new Chart(
        canvas,
        {
            type: "doughnut",

            data: {

                labels:
                    Object.keys(
                        statuses
                    ),

                datasets: [
                    {
                        data:
                            Object.values(
                                statuses
                            )
                    }
                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio:
                    false,

                plugins: {

                    legend: {
                        position:
                            "bottom"
                    }

                }
            }
        }
    );
```

}

/* =========================================================
MONTHLY APPLICATION DATA
========================================================= */

function generateMonthlyApplicationData() {

```
const now =
    new Date();


const labels = [];

const values = [];


for (
    let i = 5;
    i >= 0;
    i--
) {

    const date =
        new Date(
            now.getFullYear(),
            now.getMonth() - i,
            1
        );


    labels.push(
        date.toLocaleString(
            "en-IN",
            {
                month: "short"
            }
        )
    );


    const month =
        date.getMonth();

    const year =
        date.getFullYear();


    const count =
        dashboardState.applications
            .filter(
                application => {

                    const applicationDate =
                        new Date(
                            application.applied_at ||
                            application.created_at
                        );


                    return (
                        applicationDate.getMonth() ===
                            month &&
                        applicationDate.getFullYear() ===
                            year
                    );
                }
            )
            .length;


    values.push(count);
}


return {
    labels,
    values
};
```

}

/* =========================================================
LOCAL STATISTICS
========================================================= */

function calculateLocalStatistics() {

```
dashboardState.statistics = {

    ...dashboardState.statistics,

    applications:
        dashboardState.applications.length,

    shortlisted:
        countApplicationsByStatus(
            "shortlisted"
        ),

    interviews:
        countApplicationsByStatus(
            "interview"
        ),

    hired:
        countApplicationsByStatus(
            "hired"
        ),

    rejected:
        countApplicationsByStatus(
            "rejected"
        ),

    saved:
        dashboardState.savedJobs.length,

    total_jobs:
        dashboardState.recentJobs.length

};
```

}

/* =========================================================
RECOMMENDATION ENGINE
========================================================= */

function generateLocalRecommendations() {

```
if (
    dashboardState.recommendedJobs.length
) {
    return;
}


const profile =
    dashboardState.profile ||
    dashboardState.user ||
    {};


const skills =
    normalizeSkills(
        profile.skills
    );


const preferredLocation =
    String(
        profile.location ||
        ""
    ).toLowerCase();


const preferredCategory =
    String(
        profile.category ||
        ""
    ).toLowerCase();


dashboardState.recommendedJobs =
    dashboardState.recentJobs
        .map(
            job => {

                const jobSkills =
                    normalizeSkills(
                        job.skills
                    );


                let score = 0;


                /*
                 * Skill matching.
                 */

                if (
                    skills.length &&
                    jobSkills.length
                ) {

                    const matchingSkills =
                        skills.filter(
                            skill =>
                                jobSkills.includes(
                                    skill
                                )
                        );


                    score +=
                        Math.min(
                            60,
                            matchingSkills.length *
                            15
                        );
                }


                /*
                 * Location matching.
                 */

                if (
                    preferredLocation &&
                    String(
                        job.location ||
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            preferredLocation
                        )
                ) {

                    score += 20;
                }


                /*
                 * Category matching.
                 */

                if (
                    preferredCategory &&
                    String(
                        job.category ||
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            preferredCategory
                        )
                ) {

                    score += 20;
                }


                return {
                    ...job,
                    match_score:
                        Math.min(
                            100,
                            score
                        )
                };

            }
        )
        .sort(
            (a, b) =>
                b.match_score -
                a.match_score
        )
        .slice(
            0,
            DASHBOARD_CONFIG.maxRecommendedJobs
        );
```

}

/* =========================================================
QUICK STATS
========================================================= */

function updateQuickStats() {

```
const applicationCount =
    dashboardState.applications.length;


const pendingCount =
    countApplicationsByStatus(
        "pending"
    );


const interviewCount =
    countApplicationsByStatus(
        "interview"
    );


const hiredCount =
    countApplicationsByStatus(
        "hired"
    );


document.querySelectorAll(
    "[data-quick-stat='applications']"
).forEach(
    element =>
        element.textContent =
            applicationCount
);


document.querySelectorAll(
    "[data-quick-stat='pending']"
).forEach(
    element =>
        element.textContent =
            pendingCount
);


document.querySelectorAll(
    "[data-quick-stat='interviews']"
).forEach(
    element =>
        element.textContent =
            interviewCount
);


document.querySelectorAll(
    "[data-quick-stat='hired']"
).forEach(
    element =>
        element.textContent =
            hiredCount
);
```

}

/* =========================================================
DASHBOARD EVENTS
========================================================= */

function initializeDashboardEvents() {

```
/*
 * Notification click.
 */

document.addEventListener(
    "click",
    event => {

        const notification =
            event.target.closest(
                ".notification-item"
            );


        if (!notification) return;


        const notificationId =
            notification.dataset.notificationId;


        if (notificationId) {

            markNotificationRead(
                notificationId
            );
        }

    }
);


/*
 * Refresh button.
 */

const refreshButton =
    document.querySelector(
        "#refreshDashboard, [data-refresh-dashboard]"
    );


if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        async () => {

            await loadDashboard();

            if (
                typeof showToast ===
                "function"
            ) {

                showToast(
                    "Dashboard updated.",
                    "success"
                );
            }

        }
    );
}
```

}

/* =========================================================
DASHBOARD TABS
========================================================= */

function initializeDashboardTabs() {

```
const tabs =
    document.querySelectorAll(
        "[data-dashboard-tab]"
    );


const panels =
    document.querySelectorAll(
        "[data-dashboard-panel]"
    );


if (!tabs.length) return;


tabs.forEach(tab => {

    tab.addEventListener(
        "click",
        () => {

            const target =
                tab.dataset.dashboardTab;


            tabs.forEach(
                item =>
                    item.classList.remove(
                        "active"
                    )
            );


            panels.forEach(
                panel => {

                    panel.classList.remove(
                        "active"
                    );


                    if (
                        panel.dataset
                            .dashboardPanel ===
                        target
                    ) {

                        panel.classList.add(
                            "active"
                        );
                    }

                }
            );


            tab.classList.add(
                "active"
            );


            localStorage.setItem(
                "jobPortalDashboardTab",
                target
            );
        }
    );
});


const savedTab =
    localStorage.getItem(
        "jobPortalDashboardTab"
    );


if (savedTab) {

    const savedButton =
        document.querySelector(
            `[data-dashboard-tab="${savedTab}"]`
        );


    if (savedButton) {

        savedButton.click();
    }
}
```

}

/* =========================================================
QUICK ACTIONS
========================================================= */

function initializeQuickActions() {

```
document.querySelectorAll(
    "[data-dashboard-action]"
).forEach(button => {

    button.addEventListener(
        "click",
        event => {

            const action =
                button.dataset
                    .dashboardAction;


            switch (action) {

                case "find-jobs":

                    window.location.href =
                        "jobs.html";

                    break;


                case "profile":

                    window.location.href =
                        "profile.html";

                    break;


                case "applications":

                    window.location.href =
                        "applications.html";

                    break;


                case "post-job":

                    window.location.href =
                        "post-job.html";

                    break;


                case "saved-jobs":

                    window.location.href =
                        "jobs.html?saved=true";

                    break;

            }

        }
    );
});
```

}

/* =========================================================
MARK NOTIFICATION READ
========================================================= */

async function markNotificationRead(
notificationId
) {

```
try {

    await fetch(
        DASHBOARD_CONFIG.notificationsEndpoint,
        {
            method: "PUT",

            headers: {
                "Content-Type":
                    "application/json"
            },

            credentials: "include",

            body: JSON.stringify({
                id:
                    notificationId,
                is_read:
                    true
            })
        }
    );


    const notification =
        dashboardState.notifications
            .find(
                item =>
                    String(item.id) ===
                    String(notificationId)
            );


    if (notification) {

        notification.is_read =
            true;
    }


    renderNotifications();

} catch (error) {

    console.error(
        "Notification update failed:",
        error
    );
}
```

}

/* =========================================================
AUTO REFRESH
========================================================= */

function startDashboardRefresh() {

```
stopDashboardRefresh();


dashboardState.refreshTimer =
    setInterval(
        async () => {

            if (
                document.hidden ||
                !dashboardState.initialized
            ) {
                return;
            }


            await loadDashboard();

        },
        DASHBOARD_CONFIG.refreshInterval
    );
```

}

function stopDashboardRefresh() {

```
if (
    dashboardState.refreshTimer
) {

    clearInterval(
        dashboardState.refreshTimer
    );

    dashboardState.refreshTimer =
        null;
}
```

}

document.addEventListener(
"visibilitychange",
() => {

```
    if (
        document.hidden
    ) {

        stopDashboardRefresh();

    } else if (
        dashboardState.initialized
    ) {

        loadDashboard();

        startDashboardRefresh();
    }

}
```

);

/* =========================================================
LOADING STATE
========================================================= */

function setDashboardLoading(
loading
) {

```
dashboardState.loading =
    loading;


document.querySelectorAll(
    "[data-dashboard-loading]"
).forEach(element => {

    element.style.display =
        loading
            ? ""
            : "none";

});


document.querySelectorAll(
    ".dashboard-content"
).forEach(element => {

    element.classList.toggle(
        "loading",
        loading
    );

});
```

}

/* =========================================================
ERROR STATE
========================================================= */

function showDashboardError(
message
) {

```
const container =
    document.querySelector(
        "#dashboardError, .dashboard-error"
    );


if (container) {

    container.textContent =
        message;

    container.style.display =
        "block";
}


if (
    typeof showToast ===
    "function"
) {

    showToast(
        message,
        "error"
    );
}
```

}

/* =========================================================
HELPERS
========================================================= */

function countApplicationsByStatus(
status
) {

```
const target =
    String(
        status
    ).toLowerCase();


return dashboardState
    .applications
    .filter(
        application =>
            String(
                application.status ||
                "pending"
            ).toLowerCase() ===
            target
    )
    .length;
```

}

function normalizeSkills(
skills
) {

```
if (Array.isArray(skills)) {

    return skills
        .map(
            skill =>
                String(skill)
                    .trim()
                    .toLowerCase()
        )
        .filter(Boolean);
}


if (!skills) {
    return [];
}


return String(skills)
    .split(
        /[,|;]/g
    )
    .map(
        skill =>
            skill
                .trim()
                .toLowerCase()
    )
    .filter(Boolean);
```

}

function formatRole(
role
) {

```
const roles = {

    job_seeker:
        "Job Seeker",

    recruiter:
        "Recruiter",

    admin:
        "Administrator"

};


return (
    roles[role] ||
    "User"
);
```

}

function formatStatus(
status
) {

```
const statuses = {

    pending:
        "Pending",

    shortlisted:
        "Shortlisted",

    interview:
        "Interview",

    hired:
        "Hired",

    rejected:
        "Rejected",

    withdrawn:
        "Withdrawn",

    reviewing:
        "Under Review"

};


return (
    statuses[status] ||
    capitalizeWords(status)
);
```

}

function capitalizeWords(
text
) {

```
return String(text || "")
    .replace(
        /\b\w/g,
        letter =>
            letter.toUpperCase()
    );
```

}

function getInitials(
name
) {

```
return String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
        word =>
            word.charAt(0)
                .toUpperCase()
    )
    .join("");
```

}

function animateNumber(
element,
target
) {

```
if (!element) return;


const start =
    Number(
        element.textContent
            .replace(
                /[^0-9.-]/g,
                ""
            )
    ) || 0;


if (
    start === target
) {

    element.textContent =
        target.toLocaleString(
            "en-IN"
        );

    return;
}


const duration =
    500;


const startTime =
    performance.now();


function update(
    currentTime
) {

    const progress =
        Math.min(
            (
                currentTime -
                startTime
            ) /
            duration,
            1
        );


    const eased =
        1 -
        Math.pow(
            1 - progress,
            3
        );


    const current =
        Math.round(
            start +
            (
                target -
                start
            ) *
            eased
        );


    element.textContent =
        current.toLocaleString(
            "en-IN"
        );


    if (
        progress < 1
    ) {

        requestAnimationFrame(
            update
        );
    }
}


requestAnimationFrame(
    update
);
```

}

/* =========================================================
GLOBAL EXPORT
========================================================= */

window.JobPortalDashboard = {

```
state:
    dashboardState,

loadDashboard,

renderDashboard,

renderStatistics,

renderRecentApplications,

renderSavedJobs,

renderRecommendedJobs,

renderNotifications,

renderProfileCompletion,

generateLocalRecommendations,

startDashboardRefresh,

stopDashboardRefresh
```

}