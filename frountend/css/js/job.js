/* =========================================================
JOB PORTAL - JOB.JS
Advanced Job Listing Controller
========================================================= */

"use strict";

/* =========================================================
CONFIGURATION
========================================================= */

const JOB_CONFIG = {

```
apiEndpoint: "jobs.php",

detailsPage: "job-details.html",

loginPage: "login.html",

jobsPerPage: 9,

searchDelay: 400
```

};

/* =========================================================
STATE
========================================================= */

const jobState = {

```
jobs: [],

filteredJobs: [],

currentPage: 1,

totalPages: 1,

search: "",

location: "",

category: "",

jobType: "",

experience: "",

salary: "",

sort: "latest",

loading: false
```

};

/* =========================================================
DOM READY
========================================================= */

document.addEventListener(
"DOMContentLoaded",
() => {

```
    initializeJobsPage();

}
```

);

/* =========================================================
INITIALIZE JOB PAGE
========================================================= */

async function initializeJobsPage() {

```
initializeJobFilters();

initializeJobSearch();

initializeJobSorting();

initializeJobPagination();

initializeJobActions();

readURLFilters();

await loadJobs();
```

}

/* =========================================================
LOAD JOBS
========================================================= */

async function loadJobs() {

```
setJobsLoading(true);

try {

    const params =
        buildJobQuery();

    const response =
        await fetch(
            `${JOB_CONFIG.apiEndpoint}?${params}`,
            {
                method: "GET",

                headers: {
                    "Accept":
                        "app
            }
        );


    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );
    }


    const data =
        await response.json();


    /*
     * Support different API response formats.
     */

    if (Array.isArray(data)) {

        jobState.jobs = data;

    } else {

        jobState.jobs =
            data.jobs ||
            data.data ||
            data.results ||
            [];
    }


    jobState.filteredJobs =
        [...jobState.jobs];


    updateJobStatistics();

    applyClientFilters();

} catch (error) {

    console.error(
        "Unable to load jobs:",
        error
    );

    showJobError(
        "Unable to load jobs. Please try again."
    );

} finally {

    setJobsLoading(false);
}
```

}

/* =========================================================
BUILD API QUERY
========================================================= */

function buildJobQuery() {

```
const params =
    new URLSearchParams();


if (jobState.search) {

    params.set(
        "search",
        jobState.search
    );
}


if (jobState.location) {

    params.set(
        "location",
        jobState.location
    );
}


if (jobState.category) {

    params.set(
        "category",
        jobState.category
    );
}


if (jobState.jobType) {

    params.set(
        "job_type",
        jobState.jobType
    );
}


if (jobState.experience) {

    params.set(
        "experience",
        jobState.experience
    );
}


if (jobState.salary) {

    params.set(
        "salary",
        jobState.salary
    );
}


params.set(
    "sort",
    jobState.sort
);


return params.toString();
```

}

/* =========================================================
SEARCH
========================================================= */

function initializeJobSearch() {

```
const searchInputs =
    document.querySelectorAll(
        "#jobSearch, #searchJobs, [data-job-search]"
    );


searchInputs.forEach(input => {

    input.value =
        jobState.search;


    input.addEventListener(
        "input",
        debounce(
            event => {

                jobState.search =
                    event.target.value.trim();

                jobState.currentPage = 1;

                updateURL();

                applyClientFilters();

            },
            JOB_CONFIG.searchDelay
        )
    );


    input.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                jobState.search =
                    input.value.trim();

                jobState.currentPage = 1;

                updateURL();

                loadJobs();
            }

        }
    );

});
```

}

/* =========================================================
FILTERS
========================================================= */

function initializeJobFilters() {

```
const filterMappings = {

    location: [
        "#locationFilter",
        "#jobLocation",
        "[data-filter='location']"
    ],

    category: [
        "#categoryFilter",
        "#jobCategory",
        "[data-filter='category']"
    ],

    jobType: [
        "#jobTypeFilter",
        "#jobType",
        "[data-filter='job-type']"
    ],

    experience: [
        "#experienceFilter",
        "#experience",
        "[data-filter='experience']"
    ],

    salary: [
        "#salaryFilter",
        "#salary",
        "[data-filter='salary']"
    ]

};


Object.entries(filterMappings)
    .forEach(([stateKey, selectors]) => {

        const selector =
            selectors.join(",");

        const element =
            document.querySelector(selector);

        if (!element) return;


        element.addEventListener(
            "change",
            () => {

                jobState[stateKey] =
                    element.value.trim();

                jobState.currentPage = 1;

                updateURL();

                applyClientFilters();

            }
        );

    });


const clearButton =
    document.querySelector(
        "#clearFilters, [data-clear-filters]"
    );


if (clearButton) {

    clearButton.addEventListener(
        "click",
        clearJobFilters
    );
}
```

}

/* =========================================================
APPLY CLIENT FILTERS
========================================================= */

function applyClientFilters() {

```
const search =
    jobState.search.toLowerCase();


jobState.filteredJobs =
    jobState.jobs.filter(job => {

        const title =
            String(
                job.title ||
                job.job_title ||
                ""
            ).toLowerCase();


        const company =
            String(
                job.company ||
                job.company_name ||
                ""
            ).toLowerCase();


        const location =
            String(
                job.location ||
                ""
            ).toLowerCase();


        const category =
            String(
                job.category ||
                job.job_category ||
                ""
            ).toLowerCase();


        const description =
            String(
                job.description ||
                ""
            ).toLowerCase();


        const skills =
            String(
                job.skills ||
                ""
            ).toLowerCase();


        /*
         * Search matching.
         */

        const matchesSearch =
            !search ||
            title.includes(search) ||
            company.includes(search) ||
            location.includes(search) ||
            category.includes(search) ||
            description.includes(search) ||
            skills.includes(search);


        /*
         * Location matching.
         */

        const matchesLocation =
            !jobState.location ||
            location.includes(
                jobState.location.toLowerCase()
            );


        /*
         * Category matching.
         */

        const matchesCategory =
            !jobState.category ||
            category ===
                jobState.category.toLowerCase() ||
            category.includes(
                jobState.category.toLowerCase()
            );


        /*
         * Job type matching.
         */

        const jobType =
            String(
                job.job_type ||
                job.type ||
                ""
            ).toLowerCase();


        const matchesJobType =
            !jobState.jobType ||
            jobType.includes(
                jobState.jobType.toLowerCase()
            );


        /*
         * Experience matching.
         */

        const jobExperience =
            String(
                job.experience ||
                job.experience_level ||
                ""
            ).toLowerCase();


        const matchesExperience =
            !jobState.experience ||
            jobExperience.includes(
                jobState.experience.toLowerCase()
            );


        return (
            matchesSearch &&
            matchesLocation &&
            matchesCategory &&
            matchesJobType &&
            matchesExperience
        );

    });


sortJobs();

updatePagination();

renderJobs();

updateResultCount();
```

}

/* =========================================================
SORT JOBS
========================================================= */

function initializeJobSorting() {

```
const sortSelect =
    document.querySelector(
        "#sortJobs, #jobSort, [data-job-sort]"
    );


if (!sortSelect) return;


sortSelect.value =
    jobState.sort;


sortSelect.addEventListener(
    "change",
    () => {

        jobState.sort =
            sortSelect.value;

        sortJobs();

        jobState.currentPage = 1;

        updateURL();

        renderJobs();

    }
);
```

}

function sortJobs() {

```
jobState.filteredJobs.sort(
    (a, b) => {

        switch (jobState.sort) {

            case "oldest":

                return getDateValue(
                    a.created_at
                ) -
                getDateValue(
                    b.created_at
                );


            case "salary-high":

                return getSalary(
                    b
                ) -
                getSalary(
                    a
                );


            case "salary-low":

                return getSalary(
                    a
                ) -
                getSalary(
                    b
                );


            case "relevance":

                return 0;


            case "latest":

            default:

                return getDateValue(
                    b.created_at ||
                    b.posted_at
                ) -
                getDateValue(
                    a.created_at ||
                    a.posted_at
                );
        }

    }
);
```

}

/* =========================================================
RENDER JOBS
========================================================= */

function renderJobs() {

```
const container =
    document.querySelector(
        "#jobsContainer, .jobs-container, [data-jobs-container]"
    );


if (!container) return;


if (!jobState.filteredJobs.length) {

    renderEmptyJobs(container);

    return;
}


const start =
    (
        jobState.currentPage - 1
    ) *
    JOB_CONFIG.jobsPerPage;


const end =
    start +
    JOB_CONFIG.jobsPerPage;


const pageJobs =
    jobState.filteredJobs.slice(
        start,
        end
    );


container.innerHTML =
    pageJobs
        .map(
            job =>
                createJobCard(job)
        )
        .join("");


initializeRenderedJobActions();
```

}

/* =========================================================
JOB CARD
========================================================= */

function createJobCard(job) {

```
const id =
    job.id ||
    job.job_id;


const title =
    escapeHTML(
        job.title ||
        job.job_title ||
        "Untitled Position"
    );


const company =
    escapeHTML(
        job.company ||
        job.company_name ||
        "Company"
    );


const location =
    escapeHTML(
        job.location ||
        "Remote"
    );


const category =
    escapeHTML(
        job.category ||
        job.job_category ||
        "General"
    );


const jobType =
    escapeHTML(
        job.job_type ||
        job.type ||
        "Full Time"
    );


const experience =
    escapeHTML(
        job.experience ||
        job.experience_level ||
        "Any Experience"
    );


const salary =
    formatJobSalary(job);


const postedDate =
    formatDate(
        job.created_at ||
        job.posted_at
    );


const logo =
    job.company_logo ||
    job.logo ||
    "";


const description =
    truncateText(
        job.description ||
        "No description available.",
        130
    );


const isSaved =
    isJobSaved(id);


return `
    <article
        class="job-card"
        data-job-id="${escapeHTML(id)}"
    >

        <div class="job-card-header">

            <div class="company-logo">

                ${
                    logo
                        ? `
                            <img
                                src="${escapeHTML(logo)}"
                                alt="${company}"
                                loading="lazy"
                            >
                          `
                        : `
                            <span>
                                ${getCompanyInitial(company)}
                            </span>
                          `
                }

            </div>


            <button
                type="button"
                class="bookmark-job ${
                    isSaved
                        ? "saved"
                        : ""
                }"
                data-bookmark-job="${escapeHTML(id)}"
                aria-label="${
                    isSaved
                        ? "Remove saved job"
                        : "Save job"
                }"
            >
                ${
                    isSaved
                        ? "♥"
                        : "♡"
                }
            </button>

        </div>


        <div class="job-card-body">

            <span class="job-category">
                ${category}
            </span>


            <h3 class="job-title">

                <a
                    href="${
                        JOB_CONFIG.detailsPage
                    }?id=${encodeURIComponent(id)}"
                >
                    ${title}
                </a>

            </h3>


            <p class="company-name">
                ${company}
            </p>


            <div class="job-meta">

                <span>
                    📍 ${location}
                </span>

                <span>
                    💼 ${jobType}
                </span>

                <span>
                    🎯 ${experience}
                </span>

            </div>


            <p class="job-description">
                ${escapeHTML(description)}
            </p>


            <div class="job-salary">
                ${salary}
            </div>

        </div>


        <div class="job-card-footer">

            <span class="posted-date">
                ${postedDate}
            </span>


            <a
                href="${
                    JOB_CONFIG.detailsPage
                }?id=${encodeURIComponent(id)}"
                class="view-job-btn"
            >
                View Details →
            </a>

        </div>

    </article>
`;
```

}

/* =========================================================
EMPTY STATE
========================================================= */

function renderEmptyJobs(container) {

```
container.innerHTML = `

    <div class="jobs-empty">

        <div class="empty-icon">
            🔍
        </div>

        <h3>
            No jobs found
        </h3>

        <p>
            We couldn't find jobs matching your
            current search and filters.
        </p>

        <button
            type="button"
            class="btn btn-primary"
            data-clear-filters
        >
            Clear Filters
        </button>

    </div>

`;


const button =
    container.querySelector(
        "[data-clear-filters]"
    );


if (button) {

    button.addEventListener(
        "click",
        clearJobFilters
    );
}
```

}

/* =========================================================
PAGINATION
========================================================= */

function initializeJobPagination() {

```
document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-page]"
            );


        if (!button) return;


        const page =
            Number(
                button.dataset.page
            );


        if (
            Number.isNaN(page) ||
            page < 1 ||
            page > jobState.totalPages
        ) {
            return;
        }


        jobState.currentPage =
            page;


        renderJobs();

        updatePagination();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);
```

}

function updatePagination() {

```
jobState.totalPages =
    Math.max(
        1,
        Math.ceil(
            jobState.filteredJobs.length /
            JOB_CONFIG.jobsPerPage
        )
    );


const container =
    document.querySelector(
        "#pagination, .pagination"
    );


if (!container) return;


if (jobState.totalPages <= 1) {

    container.innerHTML = "";

    return;
}


let html = "";


html += `
    <button
        type="button"
        data-page="${
            jobState.currentPage - 1
        }"
        ${
            jobState.currentPage === 1
                ? "disabled"
                : ""
        }
    >
        ←
    </button>
`;


for (
    let page = 1;
    page <= jobState.totalPages;
    page++
) {

    html += `
        <button
            type="button"
            data-page="${page}"
            class="${
                page ===
                jobState.currentPage
                    ? "active"
                    : ""
            }"
        >
            ${page}
        </button>
    `;
}


html += `
    <button
        type="button"
        data-page="${
            jobState.currentPage + 1
        }"
        ${
            jobState.currentPage ===
            jobState.totalPages
                ? "disabled"
                : ""
        }
    >
        →
    </button>
`;


container.innerHTML =
    html;
```

}

/* =========================================================
BOOKMARK SYSTEM
========================================================= */

function initializeJobActions() {

```
document.addEventListener(
    "click",
    event => {

        const bookmark =
            event.target.closest(
                "[data-bookmark-job]"
            );


        if (bookmark) {

            event.preventDefault();

            toggleSavedJob(
                bookmark.dataset.bookmarkJob
            );
        }

    }
);
```

}

function initializeRenderedJobActions() {

```
/*
 * Reserved for additional actions
 * added after dynamic rendering.
 */
```

}

function toggleSavedJob(jobId) {

```
if (!jobId) return;


let savedJobs =
    getSavedJobs();


if (
    savedJobs.includes(
        String(jobId)
    )
) {

    savedJobs =
        savedJobs.filter(
            id =>
                id !==
                String(jobId)
        );


    showToast(
        "Job removed from saved jobs.",
        "info"
    );

} else {

    savedJobs.push(
        String(jobId)
    );


    showToast(
        "Job saved successfully.",
        "success"
    );
}


localStorage.setItem(
    "jobPortalSavedJobs",
    JSON.stringify(savedJobs)
);


renderJobs();
```

}

function getSavedJobs() {

```
try {

    const saved =
        localStorage.getItem(
            "jobPortalSavedJobs"
        );


    return saved
        ? JSON.parse(saved)
        : [];

} catch {

    return [];
}
```

}

function isJobSaved(jobId) {

```
return getSavedJobs()
    .includes(
        String(jobId)
    );
```

}

/* =========================================================
APPLY FOR JOB
========================================================= */

async function applyForJob(jobId) {

```
if (!jobId) return;


if (
    typeof getCurrentUser ===
    "function"
) {

    const user =
        getCurrentUser();


    if (!user) {

        showToast(
            "Please login before applying.",
            "warning"
        );


        setTimeout(() => {

            window.location.href =
                `${JOB_CONFIG.loginPage}?redirect=${encodeURIComponent(
                    window.location.href
                )}`;

        }, 700);


        return;
    }
}


const confirmed =
    window.confirm(
        "Are you sure you want to apply for this job?"
    );


if (!confirmed) return;


try {

    const response =
        await fetch(
            "applications.php",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    job_id: jobId
                })
            }
        );


    const data =
        await response.json();


    if (
        response.ok &&
        data.success
    ) {

        showToast(
            data.message ||
            "Application submitted successfully!",
            "success"
        );

        return;
    }


    showToast(
        data.message ||
        "Unable to submit application.",
        "error"
    );

} catch (error) {

    console.error(
        "Application Error:",
        error
    );


    showToast(
        "Server error. Please try again.",
        "error"
    );
}
```

}

/* =========================================================
CLEAR FILTERS
========================================================= */

function clearJobFilters() {

```
jobState.search = "";
jobState.location = "";
jobState.category = "";
jobState.jobType = "";
jobState.experience = "";
jobState.salary = "";
jobState.sort = "latest";
jobState.currentPage = 1;


document.querySelectorAll(
    "#jobSearch, #searchJobs, [data-job-search]"
).forEach(input => {
    input.value = "";
});


document.querySelectorAll(
    "#locationFilter, #jobLocation, " +
    "#categoryFilter, #jobCategory, " +
    "#jobTypeFilter, #jobType, " +
    "#experienceFilter, #experience, " +
    "#salaryFilter, #salary"
).forEach(element => {

    if (element.tagName === "SELECT") {
        element.value = "";
    } else {
        element.value = "";
    }

});


const sort =
    document.querySelector(
        "#sortJobs, #jobSort, [data-job-sort]"
    );


if (sort) {
    sort.value = "latest";
}


updateURL();

applyClientFilters();
```

}

/* =========================================================
URL FILTERS
========================================================= */

function readURLFilters() {

```
const params =
    new URLSearchParams(
        window.location.search
    );


jobState.search =
    params.get("search") || "";


jobState.location =
    params.get("location") || "";


jobState.category =
    params.get("category") || "";


jobState.jobType =
    params.get("job_type") || "";


jobState.experience =
    params.get("experience") || "";


jobState.salary =
    params.get("salary") || "";


jobState.sort =
    params.get("sort") ||
    "latest";


updateFilterInputs();
```

}

function updateFilterInputs() {

```
const mappings = {

    "#jobSearch": jobState.search,

    "#searchJobs": jobState.search,

    "#locationFilter": jobState.location,

    "#jobLocation": jobState.location,

    "#categoryFilter": jobState.category,

    "#jobCategory": jobState.category,

    "#jobTypeFilter": jobState.jobType,

    "#jobType": jobState.jobType,

    "#experienceFilter": jobState.experience,

    "#experience": jobState.experience,

    "#salaryFilter": jobState.salary,

    "#salary": jobState.salary,

    "#sortJobs": jobState.sort,

    "#jobSort": jobState.sort

};


Object.entries(mappings)
    .forEach(([selector, value]) => {

        const element =
            document.querySelector(
                selector
            );


        if (element) {
            element.value = value;
        }

    });
```

}

function updateURL() {

```
const url =
    new URL(
        window.location.href
    );


const parameters = {

    search: jobState.search,

    location: jobState.location,

    category: jobState.category,

    job_type: jobState.jobType,

    experience: jobState.experience,

    salary: jobState.salary,

    sort:
        jobState.sort !== "latest"
            ? jobState.sort
            : ""

};


Object.entries(parameters)
    .forEach(([key, value]) => {

        if (value) {

            url.searchParams.set(
                key,
                value
            );

        } else {

            url.searchParams.delete(
                key
            );
        }

    });


window.history.replaceState(
    {},
    "",
    url
);
```

}

/* =========================================================
JOB STATISTICS
========================================================= */

function updateJobStatistics() {

```
const total =
    jobState.jobs.length;


document.querySelectorAll(
    "[data-total-jobs], #totalJobs"
).forEach(element => {

    element.textContent =
        total.toLocaleString("en-IN");

});
```

}

function updateResultCount() {

```
const count =
    jobState.filteredJobs.length;


document.querySelectorAll(
    "#jobResultCount, [data-job-count]"
).forEach(element => {

    element.textContent =
        `${count.toLocaleString("en-IN")} jobs found`;

});
```

}

/* =========================================================
LOADING STATE
========================================================= */

function setJobsLoading(
loading
) {

```
jobState.loading =
    loading;


const container =
    document.querySelector(
        "#jobsContainer, .jobs-container, [data-jobs-container]"
    );


if (!container) return;


if (loading) {

    container.innerHTML = `

        <div class="jobs-loading">

            <div class="spinner"></div>

            <p>
                Finding the best jobs for you...
            </p>

        </div>

    `;

}
```

}

/* =========================================================
ERROR STATE
========================================================= */

function showJobError(
message
) {

```
const container =
    document.querySelector(
        "#jobsContainer, .jobs-container, [data-jobs-container]"
    );


if (!container) return;


container.innerHTML = `

    <div class="jobs-error">

        <div class="error-icon">
            ⚠
        </div>

        <h3>
            Something went wrong
        </h3>

        <p>
            ${escapeHTML(message)}
        </p>

        <button
            type="button"
            class="btn btn-primary"
            id="retryJobs"
        >
            Try Again
        </button>

    </div>

`;


const retry =
    document.querySelector(
        "#retryJobs"
    );


if (retry) {

    retry.addEventListener(
        "click",
        loadJobs
    );
}
```

}

/* =========================================================
UTILITY FUNCTIONS
========================================================= */

function getSalary(job) {

```
return Number(
    job.salary_max ||
    job.max_salary ||
    job.salary ||
    job.salary_min ||
    0
);
```

}

function formatJobSalary(job) {

```
const min =
    Number(
        job.salary_min ||
        job.min_salary ||
        0
    );


const max =
    Number(
        job.salary_max ||
        job.max_salary ||
        0
    );


if (
    min &&
    max &&
    typeof formatCurrency ===
    "function"
) {

    return `
        ${formatCurrency(min)}
        -
        ${formatCurrency(max)}
    `;
}


if (
    min &&
    typeof formatCurrency ===
    "function"
) {

    return `From ${formatCurrency(min)}`;
}


if (
    max &&
    typeof formatCurrency ===
    "function"
) {

    return `Up to ${formatCurrency(max)}`;
}


return (
    escapeHTML(
        job.salary_text ||
        "Salary not disclosed"
    )
);
```

}

function getDateValue(date) {

```
if (!date) return 0;

const timestamp =
    new Date(date).getTime();


return Number.isNaN(timestamp)
    ? 0
    : timestamp;
```

}

function truncateText(
text,
maxLength
) {

```
const clean =
    String(text || "");


if (
    clean.length <=
    maxLength
) {
    return clean;
}


return (
    clean.substring(
        0,
        maxLength
    ).trim() +
    "..."
);
```

}

function getCompanyInitial(
company
) {

```
const clean =
    String(company || "C");


return escapeHTML(
    clean
        .charAt(0)
        .toUpperCase()
);
```

}

/* =========================================================
GLOBAL EXPORT
========================================================= */

window.JobPortalJobs = {

```
state: jobState,

loadJobs,

applyForJob,

clearJobFilters,

toggleSavedJob,

getSavedJobs,

isJobSaved,

renderJobs,

createJobCard
```

}
