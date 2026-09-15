/* =========================================================
   JOBPORTAL AI — ADVANCED GLOBAL JAVASCRIPT
   File: js/main.js
   ========================================================= */

"use strict";


/* =========================================================
   GLOBAL APPLICATION
   ========================================================= */

const JobPortal = {

    config: {
        storagePrefix: "jobportal_",

        animationDuration: 300,

        toastDuration: 3200
    },


    state: {
        isMenuOpen: false,

        isLoading: false,

        currentUser: null,

        notifications: 3,

        savedJobs: [],

        recentlyViewed: []
    },


    /* =====================================================
       INITIALIZE
       ===================================================== */

    init() {

        this.cacheElements();

        this.loadState();

        this.setupNavigation();

        this.setupMobileMenu();

        this.setupGlobalSearch();

        this.setupDropdowns();

        this.setupNotifications();

        this.setupSaveButtons();

        this.setupJobLinks();

        this.setupScrollEffects();

        this.setupAnimations();

        this.setupKeyboardShortcuts();

        this.updateUserInterface();

        this.updateSavedButtons();

        console.log(
            "JobPortal AI main.js initialized."
        );
    },


    /* =====================================================
       CACHE GLOBAL ELEMENTS
       ===================================================== */

    cacheElements() {

        this.elements = {

            navbar:
                document.querySelector(".navbar"),

            mobileMenu:
                document.querySelector(
                    "#mobileMenuBtn"
                ),

            mobileClose:
                document.querySelector(
                    "#mobileCloseBtn"
                ),

            navLinks:
                document.querySelector(
                    ".nav-links"
                ),

            mobileOverlay:
                document.querySelector(
                    ".mobile-overlay"
                ),

            searchInputs:
                document.querySelectorAll(
                    '[data-global-search], .global-search input'
                ),

            notificationButtons:
                document.querySelectorAll(
                    '[data-notifications]'
                ),

            saveButtons:
                document.querySelectorAll(
                    ".save-btn, [data-save-job]"
                ),

            dropdownButtons:
                document.querySelectorAll(
                    "[data-dropdown]"
                ),

            jobLinks:
                document.querySelectorAll(
                    "[data-job-id]"
                ),

            userNames:
                document.querySelectorAll(
                    "[data-user-name]"
                ),

            userAvatars:
                document.querySelectorAll(
                    "[data-user-avatar]"
                ),

            logoutButtons:
                document.querySelectorAll(
                    '[data-logout], #logoutBtn'
                )
        };
    },


    /* =====================================================
       LOAD LOCAL STATE
       ===================================================== */

    loadState() {

        try {

            const savedJobs =
                localStorage.getItem(
                    this.storageKey("saved_jobs")
                );

            if (savedJobs) {

                this.state.savedJobs =
                    JSON.parse(savedJobs);
            }


            const recentlyViewed =
                localStorage.getItem(
                    this.storageKey("recently_viewed")
                );

            if (recentlyViewed) {

                this.state.recentlyViewed =
                    JSON.parse(
                        recentlyViewed
                    );
            }


            const user =
                localStorage.getItem(
                    this.storageKey("user")
                );

            if (user) {

                this.state.currentUser =
                    JSON.parse(user);
            }

        } catch (error) {

            console.error(
                "Failed to load application state:",
                error
            );
        }
    },


    /* =====================================================
       STORAGE KEY
       ===================================================== */

    storageKey(key) {

        return `${this.config.storagePrefix}${key}`;
    },


    /* =====================================================
       SAVE STATE
       ===================================================== */

    saveState() {

        try {

            localStorage.setItem(
                this.storageKey("saved_jobs"),
                JSON.stringify(
                    this.state.savedJobs
                )
            );


            localStorage.setItem(
                this.storageKey("recently_viewed"),
                JSON.stringify(
                    this.state.recentlyViewed
                )
            );

        } catch (error) {

            console.error(
                "Failed to save state:",
                error
            );
        }
    },


    /* =====================================================
       NAVIGATION
       ===================================================== */

    setupNavigation() {

        const currentPage =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();


        document
            .querySelectorAll(
                ".nav-links a, .sidebar-menu a"
            )
            .forEach(link => {

                const href =
                    link.getAttribute("href");

                if (!href) return;


                const linkPage =
                    href
                        .split("/")
                        .pop()
                        .split("?")[0]
                        .toLowerCase();


                if (
                    linkPage &&
                    linkPage === currentPage
                ) {

                    link.classList.add(
                        "active"
                    );
                }
            });


        document
            .querySelectorAll(
                '[data-navigate]'
            )
            .forEach(element => {

                element.addEventListener(
                    "click",
                    () => {

                        const destination =
                            element.dataset.navigate;

                        if (destination) {

                            this.navigate(
                                destination
                            );
                        }
                    }
                );
            });
    },


    /* =====================================================
       NAVIGATE
       ===================================================== */

    navigate(url) {

        if (!url) return;

        this.showPageLoader();

        setTimeout(
            () => {

                window.location.href =
                    url;

            },
            150
        );
    },


    /* =====================================================
       MOBILE MENU
       ===================================================== */

    setupMobileMenu() {

        const openButtons = [
            this.elements.mobileMenu,
            document.querySelector(
                ".mobile-menu-btn"
            ),
            document.querySelector(
                "#menuToggle"
            )
        ].filter(Boolean);


        const closeButtons = [
            this.elements.mobileClose,
            document.querySelector(
                ".mobile-menu-close"
            )
        ].filter(Boolean);


        openButtons.forEach(button => {

            button.addEventListener(
                "click",
                () => this.openMobileMenu()
            );

        });


        closeButtons.forEach(button => {

            button.addEventListener(
                "click",
                () => this.closeMobileMenu()
            );

        });


        this.elements.mobileOverlay
            ?.addEventListener(
                "click",
                () => this.closeMobileMenu()
            );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape" &&
                    this.state.isMenuOpen
                ) {

                    this.closeMobileMenu();
                }
            }
        );
    },


    /* =====================================================
       OPEN MOBILE MENU
       ===================================================== */

    openMobileMenu() {

        this.state.isMenuOpen = true;


        this.elements.navLinks
            ?.classList.add("active");


        this.elements.mobileOverlay
            ?.classList.add("active");


        document.body.classList.add(
            "menu-open"
        );
    },


    /* =====================================================
       CLOSE MOBILE MENU
       ===================================================== */

    closeMobileMenu() {

        this.state.isMenuOpen = false;


        this.elements.navLinks
            ?.classList.remove("active");


        this.elements.mobileOverlay
            ?.classList.remove("active");


        document.body.classList.remove(
            "menu-open"
        );
    },


    /* =====================================================
       GLOBAL SEARCH
       ===================================================== */

    setupGlobalSearch() {

        this.elements.searchInputs
            .forEach(input => {

                input.addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key !==
                            "Enter"
                        ) {

                            return;
                        }


                        const query =
                            input.value.trim();


                        if (!query) {

                            this.showToast(
                                "Enter a job title, skill or company.",
                                "info"
                            );

                            return;
                        }


                        this.searchJobs(
                            query
                        );
                    }
                );

            });
    },


    /* =====================================================
       SEARCH JOBS
       ===================================================== */

    searchJobs(query) {

        const encodedQuery =
            encodeURIComponent(query);


        this.showPageLoader();


        setTimeout(
            () => {

                window.location.href =
                    `jobs.html?search=${encodedQuery}`;

            },
            150
        );
    },


    /* =====================================================
       DROPDOWNS
       ===================================================== */

    setupDropdowns() {

        this.elements.dropdownButtons
            .forEach(button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        const targetId =
                            button.dataset.dropdown;


                        const dropdown =
                            document.getElementById(
                                targetId
                            );


                        if (!dropdown) return;


                        document
                            .querySelectorAll(
                                ".dropdown.active"
                            )
                            .forEach(item => {

                                if (
                                    item !==
                                    dropdown
                                ) {

                                    item.classList.remove(
                                        "active"
                                    );
                                }
                            });


                        dropdown.classList.toggle(
                            "active"
                        );
                    }
                );
            });


        document.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".dropdown.active"
                    )
                    .forEach(dropdown => {

                        dropdown.classList.remove(
                            "active"
                        );
                    });
            }
        );
    },


    /* =====================================================
       NOTIFICATIONS
       ===================================================== */

    setupNotifications() {

        this.elements.notificationButtons
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        this.toggleNotificationPanel(
                            button
                        );
                    }
                );
            });
    },


    /* =====================================================
       NOTIFICATION PANEL
       ===================================================== */

    toggleNotificationPanel(button) {

        let panel =
            document.querySelector(
                ".notification-panel"
            );


        if (!panel) {

            panel =
                this.createNotificationPanel(
                    button
                );
        }


        panel.classList.toggle(
            "active"
        );
    },


    /* =====================================================
       CREATE NOTIFICATION PANEL
       ===================================================== */

    createNotificationPanel() {

        const panel =
            document.createElement(
                "div"
            );


        panel.className =
            "notification-panel";


        panel.innerHTML = `

            <div class="notification-header">

                <div>
                    <strong>Notifications</strong>

                    <span>
                        ${this.state.notifications}
                        new
                    </span>
                </div>

                <button
                    type="button"
                    class="notification-mark-read"
                >
                    Mark all read
                </button>

            </div>


            <div class="notification-list">

                <div class="notification-item unread">

                    <div class="notification-icon">
                        <i class="fa-solid fa-briefcase"></i>
                    </div>

                    <div>
                        <strong>New job match</strong>

                        <p>
                            A new role matches
                            94% of your profile.
                        </p>

                        <small>
                            10 minutes ago
                        </small>
                    </div>

                </div>


                <div class="notification-item">

                    <div class="notification-icon">
                        <i class="fa-solid fa-calendar-check"></i>
                    </div>

                    <div>
                        <strong>Interview update</strong>

                        <p>
                            Your application status
                            has been updated.
                        </p>

                        <small>
                            2 hours ago
                        </small>
                    </div>

                </div>


                <div class="notification-item">

                    <div class="notification-icon">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>

                    <div>
                        <strong>AI Career Insight</strong>

                        <p>
                            Add 2 more skills to improve
                            your profile score.
                        </p>

                        <small>
                            Yesterday
                        </small>
                    </div>

                </div>

            </div>
        `;


        document.body.appendChild(
            panel
        );


        panel
            .querySelector(
                ".notification-mark-read"
            )
            ?.addEventListener(
                "click",
                () => {

                    panel
                        .querySelectorAll(
                            ".unread"
                        )
                        .forEach(item => {

                            item.classList.remove(
                                "unread"
                            );
                        });


                    this.state.notifications =
                        0;


                    this.showToast(
                        "All notifications marked as read.",
                        "success"
                    );
                }
            );


        return panel;
    },


    /* =====================================================
       SAVE JOB BUTTONS
       ===================================================== */

    setupSaveButtons() {

        this.elements.saveButtons
            .forEach(button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        const jobId =
                            button.dataset.jobId ||
                            button.closest(
                                "[data-job-id]"
                            )?.dataset.jobId;


                        if (!jobId) {

                            this.showToast(
                                "Job information unavailable.",
                                "error"
                            );

                            return;
                        }


                        this.toggleSaveJob(
                            jobId,
                            button
                        );
                    }
                );
            });
    },


    /* =====================================================
       TOGGLE SAVE JOB
       ===================================================== */

    toggleSaveJob(
        jobId,
        button = null
    ) {

        const index =
            this.state.savedJobs.indexOf(
                jobId
            );


        const isSaved =
            index !== -1;


        if (isSaved) {

            this.state.savedJobs.splice(
                index,
                1
            );

        } else {

            this.state.savedJobs.push(
                jobId
            );
        }


        this.saveState();

        this.updateSavedButtons();


        if (button) {

            this.updateSaveButton(
                button,
                !isSaved
            );
        }


        this.showToast(
            isSaved
                ? "Job removed from saved jobs."
                : "Job saved successfully!",
            isSaved
                ? "info"
                : "success"
        );
    },


    /* =====================================================
       UPDATE SAVE BUTTON
       ===================================================== */

    updateSaveButton(
        button,
        saved
    ) {

        button.classList.toggle(
            "saved",
            saved
        );


        button.setAttribute(
            "aria-pressed",
            String(saved)
        );


        const icon =
            button.querySelector("i");


        if (icon) {

            icon.classList.toggle(
                "fa-regular",
                !saved
            );

            icon.classList.toggle(
                "fa-solid",
                saved
            );
        }
    },


    /* =====================================================
       UPDATE ALL SAVE BUTTONS
       ===================================================== */

    updateSavedButtons() {

        document
            .querySelectorAll(
                ".save-btn, [data-save-job]"
            )
            .forEach(button => {

                const jobId =
                    button.dataset.jobId ||
                    button.closest(
                        "[data-job-id]"
                    )?.dataset.jobId;


                if (!jobId) return;


                const saved =
                    this.state.savedJobs.includes(
                        jobId
                    );


                this.updateSaveButton(
                    button,
                    saved
                );
            });
    },


    /* =====================================================
       JOB LINKS
       ===================================================== */

    setupJobLinks() {

        this.elements.jobLinks
            .forEach(element => {

                element.addEventListener(
                    "click",
                    event => {

                        const jobId =
                            element.dataset.jobId;


                        if (!jobId) return;


                        this.addRecentlyViewed(
                            jobId
                        );
                    }
                );
            });
    },


    /* =====================================================
       RECENTLY VIEWED
       ===================================================== */

    addRecentlyViewed(jobId) {

        this.state.recentlyViewed =
            this.state.recentlyViewed
                .filter(
                    id => id !== jobId
                );


        this.state.recentlyViewed
            .unshift(jobId);


        this.state.recentlyViewed =
            this.state.recentlyViewed
                .slice(0, 10);


        this.saveState();
    },


    /* =====================================================
       SCROLL EFFECTS
       ===================================================== */

    setupScrollEffects() {

        const updateNavbar =
            () => {

                if (
                    !this.elements.navbar
                ) return;


                this.elements.navbar
                    .classList.toggle(
                        "scrolled",
                        window.scrollY > 20
                    );
            };


        window.addEventListener(
            "scroll",
            updateNavbar,
            {
                passive: true
            }
        );


        updateNavbar();
    },


    /* =====================================================
       ANIMATIONS
       ===================================================== */

    setupAnimations() {

        const animatedElements =
            document.querySelectorAll(
                "[data-animate]"
            );


        if (
            !animatedElements.length
        ) {

            return;
        }


        if (
            !("IntersectionObserver" in window)
        ) {

            animatedElements
                .forEach(element => {

                    element.classList.add(
                        "animated"
                    );

                });

            return;
        }


        const observer =
            new IntersectionObserver(
                entries => {

                    entries.forEach(
                        entry => {

                            if (
                                !entry.isIntersecting
                            ) {

                                return;
                            }


                            entry.target
                                .classList.add(
                                    "animated"
                                );


                            observer.unobserve(
                                entry.target
                            );
                        }
                    );

                },
                {
                    threshold: 0.12
                }
            );


        animatedElements
            .forEach(element => {

                observer.observe(
                    element
                );

            });
    },


    /* =====================================================
       KEYBOARD SHORTCUTS
       ===================================================== */

    setupKeyboardShortcuts() {

        document.addEventListener(
            "keydown",
            event => {

                /* Ctrl + K */

                if (
                    (event.ctrlKey ||
                     event.metaKey) &&
                    event.key.toLowerCase() === "k"
                ) {

                    event.preventDefault();

                    const search =
                        document.querySelector(
                            '[data-global-search], .global-search input'
                        );


                    if (search) {

                        search.focus();
                    }
                }


                /* Escape */

                if (
                    event.key === "Escape"
                ) {

                    this.closeMobileMenu();


                    document
                        .querySelectorAll(
                            ".dropdown.active"
                        )
                        .forEach(
                            dropdown => {

                                dropdown.classList.remove(
                                    "active"
                                );
                            }
                        );


                    document
                        .querySelector(
                            ".notification-panel.active"
                        )
                        ?.classList.remove(
                            "active"
                        );
                }
            }
        );
    },


    /* =====================================================
       UPDATE USER INTERFACE
       ===================================================== */

    updateUserInterface() {

        const user =
            this.state.currentUser;


        if (!user) {

            return;
        }


        this.elements.userNames
            .forEach(element => {

                element.textContent =
                    user.name ||
                    user.username ||
                    "Job Seeker";
            });


        this.elements.userAvatars
            .forEach(element => {

                element.textContent =
                    this.getInitials(
                        user.name ||
                        user.username ||
                        "Job Seeker"
                    );
            });
    },


    /* =====================================================
       GET INITIALS
       ===================================================== */

    getInitials(name) {

        return String(name)
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(
                word =>
                    word
                        .charAt(0)
                        .toUpperCase()
            )
            .join("");
    },


    /* =====================================================
       LOGIN USER
       ===================================================== */

    setUser(user) {

        if (!user) return;


        this.state.currentUser =
            user;


        localStorage.setItem(
            this.storageKey("user"),
            JSON.stringify(user)
        );


        this.updateUserInterface();
    },


    /* =====================================================
       LOGOUT
       ===================================================== */

    logout() {

        localStorage.removeItem(
            this.storageKey("user")
        );


        sessionStorage.clear();


        this.state.currentUser =
            null;


        this.showToast(
            "You have been logged out.",
            "success"
        );


        setTimeout(
            () => {

                window.location.href =
                    "login.html";

            },
            600
        );
    },


    /* =====================================================
       LOGOUT EVENTS
       ===================================================== */

    setupLogout() {

        this.elements.logoutButtons
            .forEach(button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        this.logout();
                    }
                );
            });
    },


    /* =====================================================
       PAGE LOADER
       ===================================================== */

    showPageLoader() {

        let loader =
            document.querySelector(
                "#pageLoader"
            );


        if (!loader) {

            loader =
                document.createElement(
                    "div"
                );


            loader.id =
                "pageLoader";


            loader.innerHTML = `
                <div class="page-loader-spinner"></div>
            `;


            document.body.appendChild(
                loader
            );
        }


        requestAnimationFrame(
            () => {

                loader.classList.add(
                    "active"
                );
            }
        );
    },


    /* =====================================================
       HIDE PAGE LOADER
       ===================================================== */

    hidePageLoader() {

        document
            .querySelector(
                "#pageLoader"
            )
            ?.classList.remove(
                "active"
            );
    },


    /* =====================================================
       LOADING BUTTON
       ===================================================== */

    setButtonLoading(
        button,
        loading,
        text = "Loading..."
    ) {

        if (!button) return;


        if (loading) {

            button.dataset.originalText =
                button.innerHTML;


            button.disabled =
                true;


            button.innerHTML = `
                <span class="btn-spinner"></span>
                ${text}
            `;

        } else {

            button.disabled =
                false;


            if (
                button.dataset.originalText
            ) {

                button.innerHTML =
                    button.dataset.originalText;

                delete button.dataset
                    .originalText;
            }
        }
    },


    /* =====================================================
       TOAST SYSTEM
       ===================================================== */

    showToast(
        message,
        type = "info"
    ) {

        let toast =
            document.querySelector(
                "#globalToast"
            );


        if (!toast) {

            toast =
                document.createElement(
                    "div"
                );


            toast.id =
                "globalToast";


            document.body.appendChild(
                toast
            );
        }


        const icons = {

            success:
                "fa-circle-check",

            error:
                "fa-circle-exclamation",

            warning:
                "fa-triangle-exclamation",

            info:
                "fa-circle-info"
        };


        toast.className =
            `global-toast ${type}`;


        toast.innerHTML = `

            <span class="global-toast-icon">

                <i class="fa-solid ${
                    icons[type] ||
                    icons.info
                }"></i>

            </span>

            <span class="global-toast-message">
                ${this.escapeHTML(message)}
            </span>

            <button
                type="button"
                class="global-toast-close"
                aria-label="Close notification"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;


        requestAnimationFrame(
            () => {

                toast.classList.add(
                    "show"
                );
            }
        );


        toast
            .querySelector(
                ".global-toast-close"
            )
            ?.addEventListener(
                "click",
                () => {

                    toast.classList.remove(
                        "show"
                    );
                }
            );


        clearTimeout(
            this.toastTimer
        );


        this.toastTimer =
            setTimeout(
                () => {

                    toast.classList.remove(
                        "show"
                    );

                },
                this.config.toastDuration
            );
    },


    /* =====================================================
       CONFIRM ACTION
       ===================================================== */

    confirm(
        message,
        callback
    ) {

        const result =
            window.confirm(
                message
            );


        if (
            result &&
            typeof callback ===
            "function"
        ) {

            callback();
        }


        return result;
    },


    /* =====================================================
       HTML ESCAPE
       ===================================================== */

    escapeHTML(value) {

        return String(value)
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    },


    /* =====================================================
       DEBOUNCE
       ===================================================== */

    debounce(
        callback,
        delay = 300
    ) {

        let timer;


        return (...args) => {

            clearTimeout(
                timer
            );


            timer =
                setTimeout(
                    () => {

                        callback(
                            ...args
                        );

                    },
                    delay
                );
        };
    },


    /* =====================================================
       API REQUEST HELPER
       ===================================================== */

    async api(
        url,
        options = {}
    ) {

        try {

            const response =
                await fetch(
                    url,
                    {
                        credentials:
                            "include",

                        ...options,

                        headers: {
                            "Content-Type":
                                "application/json",

                            ...(options.headers ||
                                {})
                        }
                    }
                );


            const contentType =
                response.headers
                    .get(
                        "content-type"
                    );


            let data;


            if (
                contentType &&
                contentType.includes(
                    "application/json"
                )
            ) {

                data =
                    await response.json();

            } else {

                data =
                    await response.text();
            }


            if (!response.ok) {

                throw new Error(
                    data?.message ||
                    "Request failed."
                );
            }


            return data;

        } catch (error) {

            console.error(
                "API Error:",
                error
            );


            this.showToast(
                error.message ||
                "Something went wrong.",
                "error"
            );


            throw error;
        }
    }
};


/* =========================================================
   INITIALIZE AFTER DOM LOAD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        JobPortal.init();

        JobPortal.setupLogout();

    }
);


/* =========================================================
   GLOBAL ACCESS
   ========================================================= */

window.JobPortal =
    JobPortal;