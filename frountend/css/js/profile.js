/* =========================================================
   JOBPORTAL AI — ADVANCED PROFILE JAVASCRIPT
   File: js/profile.js
   ========================================================= */

"use strict";


/* =========================================================
   PROFILE STATE
   ========================================================= */

const ProfileApp = {

    state: {
        editing: false,

        profile: {
            name: "",
            email: "",
            phone: "",
            location: "",
            headline: "",
            bio: "",
            experience: "",
            education: "",
            website: "",
            linkedin: "",
            github: "",
            skills: []
        },

        maxSkills: 15
    },


    /* =====================================================
       INITIALIZE
       ===================================================== */

    init() {

        this.cacheElements();

        this.loadProfile();

        this.bindEvents();

        this.updateProfileUI();

        this.calculateProfileCompletion();

        this.updateAIScore();

        console.log("Profile AI initialized successfully.");
    },


    /* =====================================================
       CACHE ELEMENTS
       ===================================================== */

    cacheElements() {

        this.elements = {

            profileForm:
                document.querySelector("#profileForm"),

            editButton:
                document.querySelector("#editProfileBtn"),

            cancelButton:
                document.querySelector("#cancelProfileBtn"),

            saveButton:
                document.querySelector("#saveProfileBtn"),

            photoInput:
                document.querySelector("#profilePhotoInput"),

            photoPreview:
                document.querySelector("#profilePhoto"),

            resumeInput:
                document.querySelector("#resumeInput"),

            resumeName:
                document.querySelector("#resumeName"),

            skillInput:
                document.querySelector("#skillInput"),

            skillAddButton:
                document.querySelector("#addSkillBtn"),

            skillsContainer:
                document.querySelector("#skillsContainer"),

            completionValue:
                document.querySelector("#profileCompletion"),

            completionBar:
                document.querySelector("#profileCompletionBar"),

            aiScore:
                document.querySelector("#profileAIScore"),

            aiScoreBar:
                document.querySelector("#profileAIScoreBar"),

            toast:
                document.querySelector("#profileToast"),

            passwordInputs:
                document.querySelectorAll(
                    '[data-password-toggle]'
                ),

            inputs:
                document.querySelectorAll(
                    "#profileForm input, #profileForm textarea, #profileForm select"
                )
        };
    },


    /* =====================================================
       EVENT BINDINGS
       ===================================================== */

    bindEvents() {

        /* Edit profile */

        this.elements.editButton?.addEventListener(
            "click",
            () => this.enableEditing()
        );


        /* Cancel */

        this.elements.cancelButton?.addEventListener(
            "click",
            () => this.cancelEditing()
        );


        /* Save */

        this.elements.profileForm?.addEventListener(
            "submit",
            (event) => this.saveProfile(event)
        );


        /* Profile photo */

        this.elements.photoInput?.addEventListener(
            "change",
            (event) => this.handlePhotoUpload(event)
        );


        /* Resume */

        this.elements.resumeInput?.addEventListener(
            "change",
            (event) => this.handleResumeUpload(event)
        );


        /* Add skill */

        this.elements.skillAddButton?.addEventListener(
            "click",
            () => this.addSkill()
        );


        /* Enter skill */

        this.elements.skillInput?.addEventListener(
            "keydown",
            (event) => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    this.addSkill();
                }
            }
        );


        /* Password toggles */

        this.elements.passwordInputs.forEach(button => {

            button.addEventListener(
                "click",
                () => this.togglePassword(button)
            );

        });


        /* Live profile calculation */

        this.elements.inputs.forEach(input => {

            input.addEventListener(
                "input",
                () => {

                    this.calculateProfileCompletion();

                    this.updateAIScore();
                }
            );

        });
    },


    /* =====================================================
       LOAD PROFILE
       ===================================================== */

    loadProfile() {

        const savedProfile =
            localStorage.getItem("jobportal_profile");

        if (!savedProfile) {

            this.populateFromHTML();

            return;
        }

        try {

            const profile =
                JSON.parse(savedProfile);

            this.state.profile = {
                ...this.state.profile,
                ...profile
            };

        } catch (error) {

            console.error(
                "Unable to load profile:",
                error
            );

            this.populateFromHTML();
        }
    },


    /* =====================================================
       READ CURRENT HTML VALUES
       ===================================================== */

    populateFromHTML() {

        const profile = this.state.profile;

        profile.name =
            this.getValue("fullName");

        profile.email =
            this.getValue("email");

        profile.phone =
            this.getValue("phone");

        profile.location =
            this.getValue("location");

        profile.headline =
            this.getValue("headline");

        profile.bio =
            this.getValue("bio");

        profile.experience =
            this.getValue("experience");

        profile.education =
            this.getValue("education");

        profile.website =
            this.getValue("website");

        profile.linkedin =
            this.getValue("linkedin");

        profile.github =
            this.getValue("github");
    },


    /* =====================================================
       GET VALUE
       ===================================================== */

    getValue(id) {

        const element =
            document.getElementById(id);

        return element
            ? element.value.trim()
            : "";
    },


    /* =====================================================
       SET VALUE
       ===================================================== */

    setValue(id, value) {

        const element =
            document.getElementById(id);

        if (element) {

            element.value =
                value || "";
        }
    },


    /* =====================================================
       UPDATE PROFILE UI
       ===================================================== */

    updateProfileUI() {

        const profile =
            this.state.profile;

        this.setValue(
            "fullName",
            profile.name
        );

        this.setValue(
            "email",
            profile.email
        );

        this.setValue(
            "phone",
            profile.phone
        );

        this.setValue(
            "location",
            profile.location
        );

        this.setValue(
            "headline",
            profile.headline
        );

        this.setValue(
            "bio",
            profile.bio
        );

        this.setValue(
            "experience",
            profile.experience
        );

        this.setValue(
            "education",
            profile.education
        );

        this.setValue(
            "website",
            profile.website
        );

        this.setValue(
            "linkedin",
            profile.linkedin
        );

        this.setValue(
            "github",
            profile.github
        );


        this.renderSkills();

        this.updateProfileName();

        this.updateProfileAvatar();
    },


    /* =====================================================
       EDIT MODE
       ===================================================== */

    enableEditing() {

        this.state.editing = true;

        this.elements.inputs.forEach(input => {

            input.removeAttribute("disabled");

            input.removeAttribute("readonly");
        });


        this.elements.editButton?.classList.add(
            "hidden"
        );

        this.elements.cancelButton?.classList.remove(
            "hidden"
        );

        this.elements.saveButton?.classList.remove(
            "hidden"
        );


        this.showToast(
            "Profile editing enabled.",
            "info"
        );
    },


    /* =====================================================
       CANCEL EDITING
       ===================================================== */

    cancelEditing() {

        this.state.editing = false;

        this.updateProfileUI();

        this.disableEditing();

        this.showToast(
            "Changes discarded.",
            "info"
        );
    },


    /* =====================================================
       DISABLE EDITING
       ===================================================== */

    disableEditing() {

        this.elements.inputs.forEach(input => {

            if (
                input.type !== "file" &&
                input.dataset.alwaysEditable !== "true"
            ) {

                input.setAttribute(
                    "disabled",
                    "disabled"
                );
            }
        });


        this.elements.editButton?.classList.remove(
            "hidden"
        );

        this.elements.cancelButton?.classList.add(
            "hidden"
        );

        this.elements.saveButton?.classList.add(
            "hidden"
        );
    },


    /* =====================================================
       SAVE PROFILE
       ===================================================== */

    saveProfile(event) {

        event.preventDefault();

        if (!this.validateProfile()) {

            this.showToast(
                "Please fix the highlighted fields.",
                "error"
            );

            return;
        }


        const profile =
            this.collectProfileData();


        this.state.profile =
            profile;


        localStorage.setItem(
            "jobportal_profile",
            JSON.stringify(profile)
        );


        this.state.editing = false;

        this.disableEditing();

        this.calculateProfileCompletion();

        this.updateAIScore();

        this.updateProfileName();

        this.updateProfileAvatar();


        this.showToast(
            "Profile saved successfully!",
            "success"
        );


        /* Future backend */

        /*
        fetch("php/update-profile.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(profile)
        });
        */
    },


    /* =====================================================
       COLLECT PROFILE DATA
       ===================================================== */

    collectProfileData() {

        return {

            name:
                this.getValue("fullName"),

            email:
                this.getValue("email"),

            phone:
                this.getValue("phone"),

            location:
                this.getValue("location"),

            headline:
                this.getValue("headline"),

            bio:
                this.getValue("bio"),

            experience:
                this.getValue("experience"),

            education:
                this.getValue("education"),

            website:
                this.getValue("website"),

            linkedin:
                this.getValue("linkedin"),

            github:
                this.getValue("github"),

            skills:
                [...this.state.profile.skills]
        };
    },


    /* =====================================================
       VALIDATE PROFILE
       ===================================================== */

    validateProfile() {

        let valid = true;


        const name =
            document.getElementById("fullName");

        const email =
            document.getElementById("email");


        /* Name */

        if (
            name &&
            name.value.trim().length < 2
        ) {

            this.markInvalid(
                name,
                "Please enter your full name."
            );

            valid = false;

        } else {

            this.clearInvalid(name);
        }


        /* Email */

        if (
            email &&
            !this.isValidEmail(
                email.value.trim()
            )
        ) {

            this.markInvalid(
                email,
                "Please enter a valid email."
            );

            valid = false;

        } else {

            this.clearInvalid(email);
        }


        return valid;
    },


    /* =====================================================
       EMAIL VALIDATION
       ===================================================== */

    isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email);
    },


    /* =====================================================
       INVALID FIELD
       ===================================================== */

    markInvalid(element, message) {

        if (!element) return;

        element.classList.add(
            "input-error"
        );

        element.setAttribute(
            "aria-invalid",
            "true"
        );

        element.setAttribute(
            "title",
            message
        );
    },


    /* =====================================================
       CLEAR INVALID
       ===================================================== */

    clearInvalid(element) {

        if (!element) return;

        element.classList.remove(
            "input-error"
        );

        element.removeAttribute(
            "aria-invalid"
        );

        element.removeAttribute(
            "title"
        );
    },


    /* =====================================================
       PROFILE COMPLETION
       ===================================================== */

    calculateProfileCompletion() {

        const profile =
            this.collectProfileData();

        const fields = [

            profile.name,

            profile.email,

            profile.phone,

            profile.location,

            profile.headline,

            profile.bio,

            profile.experience,

            profile.education,

            profile.skills.length > 0
                ? "skills"
                : "",

            profile.linkedin,

            profile.github
        ];


        const completed =
            fields.filter(
                field =>
                    field &&
                    field.toString().trim()
            ).length;


        const percentage =
            Math.round(
                (completed / fields.length) * 100
            );


        if (this.elements.completionValue) {

            this.elements.completionValue.textContent =
                `${percentage}%`;
        }


        if (this.elements.completionBar) {

            this.elements.completionBar.style.width =
                `${percentage}%`;
        }


        return percentage;
    },


    /* =====================================================
       AI PROFILE SCORE
       ===================================================== */

    updateAIScore() {

        const profile =
            this.collectProfileData();


        let score = 0;


        /* Basic information */

        if (profile.name) score += 10;

        if (profile.email) score += 5;

        if (profile.phone) score += 5;

        if (profile.location) score += 5;


        /* Professional information */

        if (profile.headline) score += 10;

        if (profile.bio) score += 10;

        if (profile.experience) score += 10;

        if (profile.education) score += 10;


        /* Skills */

        if (profile.skills.length >= 3) {

            score += 10;
        }

        if (profile.skills.length >= 6) {

            score += 5;
        }


        /* Professional links */

        if (profile.linkedin) score += 5;

        if (profile.github) score += 5;


        score =
            Math.min(score, 100);


        if (this.elements.aiScore) {

            this.elements.aiScore.textContent =
                `${score}%`;
        }


        if (this.elements.aiScoreBar) {

            this.elements.aiScoreBar.style.width =
                `${score}%`;
        }


        this.updateAISuggestions(score);


        return score;
    },


    /* =====================================================
       AI SUGGESTIONS
       ===================================================== */

    updateAISuggestions(score) {

        const container =
            document.querySelector(
                "#aiSuggestions"
            );

        if (!container) return;


        let suggestions = [];


        const profile =
            this.state.profile;


        if (!profile.headline) {

            suggestions.push(
                "Add a professional headline."
            );
        }


        if (!profile.bio) {

            suggestions.push(
                "Write a short professional summary."
            );
        }


        if (profile.skills.length < 5) {

            suggestions.push(
                "Add at least 5 relevant skills."
            );
        }


        if (!profile.linkedin) {

            suggestions.push(
                "Add your LinkedIn profile."
            );
        }


        if (!profile.github) {

            suggestions.push(
                "Add your GitHub profile."
            );
        }


        if (score >= 85) {

            suggestions = [
                "Your profile is highly competitive.",
                "Keep your skills updated.",
                "Apply to AI-recommended jobs."
            ];
        }


        container.innerHTML =
            suggestions
                .slice(0, 4)
                .map(
                    suggestion => `
                        <div class="ai-suggestion-item">
                            <span class="ai-suggestion-icon">
                                <i class="fa-solid fa-wand-magic-sparkles"></i>
                            </span>

                            <span>
                                ${this.escapeHTML(
                                    suggestion
                                )}
                            </span>
                        </div>
                    `
                )
                .join("");
    },


    /* =====================================================
       ADD SKILL
       ===================================================== */

    addSkill() {

        const input =
            this.elements.skillInput;

        if (!input) return;


        const skill =
            input.value.trim();


        if (!skill) {

            this.showToast(
                "Enter a skill first.",
                "error"
            );

            return;
        }


        if (
            this.state.profile.skills
                .some(
                    existing =>
                        existing.toLowerCase() ===
                        skill.toLowerCase()
                )
        ) {

            this.showToast(
                "This skill already exists.",
                "error"
            );

            input.value = "";

            return;
        }


        if (
            this.state.profile.skills.length >=
            this.state.maxSkills
        ) {

            this.showToast(
                "Maximum 15 skills allowed.",
                "error"
            );

            return;
        }


        this.state.profile.skills.push(
            skill
        );


        input.value = "";


        this.renderSkills();

        this.calculateProfileCompletion();

        this.updateAIScore();
    },


    /* =====================================================
       REMOVE SKILL
       ===================================================== */

    removeSkill(index) {

        if (
            index < 0 ||
            index >=
            this.state.profile.skills.length
        ) {

            return;
        }


        this.state.profile.skills.splice(
            index,
            1
        );


        this.renderSkills();

        this.calculateProfileCompletion();

        this.updateAIScore();
    },


    /* =====================================================
       RENDER SKILLS
       ===================================================== */

    renderSkills() {

        const container =
            this.elements.skillsContainer;

        if (!container) return;


        if (
            this.state.profile.skills.length === 0
        ) {

            container.innerHTML = `
                <div class="skills-empty">
                    <i class="fa-solid fa-layer-group"></i>
                    <span>No skills added yet.</span>
                </div>
            `;

            return;
        }


        container.innerHTML =
            this.state.profile.skills
                .map(
                    (skill, index) => `
                        <div class="profile-skill">
                            <span>
                                ${this.escapeHTML(skill)}
                            </span>

                            <button
                                type="button"
                                class="remove-skill"
                                data-index="${index}"
                                aria-label="Remove ${this.escapeHTML(skill)}"
                            >
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    `
                )
                .join("");


        container
            .querySelectorAll(
                ".remove-skill"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        this.removeSkill(
                            Number(
                                button.dataset.index
                            )
                        );
                    }
                );

            });
    },


    /* =====================================================
       PHOTO UPLOAD
       ===================================================== */

    handlePhotoUpload(event) {

        const file =
            event.target.files?.[0];

        if (!file) return;


        if (!file.type.startsWith("image/")) {

            this.showToast(
                "Please select an image file.",
                "error"
            );

            return;
        }


        if (file.size > 5 * 1024 * 1024) {

            this.showToast(
                "Image must be smaller than 5MB.",
                "error"
            );

            return;
        }


        const reader =
            new FileReader();


        reader.onload = () => {

            if (this.elements.photoPreview) {

                this.elements.photoPreview.src =
                    reader.result;
            }


            localStorage.setItem(
                "jobportal_profile_photo",
                reader.result
            );


            this.showToast(
                "Profile photo updated.",
                "success"
            );
        };


        reader.readAsDataURL(file);
    },


    /* =====================================================
       LOAD PROFILE PHOTO
       ===================================================== */

    updateProfileAvatar() {

        const savedPhoto =
            localStorage.getItem(
                "jobportal_profile_photo"
            );


        if (
            savedPhoto &&
            this.elements.photoPreview
        ) {

            this.elements.photoPreview.src =
                savedPhoto;
        }
    },


    /* =====================================================
       UPDATE NAME
       ===================================================== */

    updateProfileName() {

        const profile =
            this.state.profile;


        const elements =
            document.querySelectorAll(
                "[data-profile-name]"
            );


        elements.forEach(element => {

            element.textContent =
                profile.name || "Job Seeker";
        });
    },


    /* =====================================================
       UPDATE AVATAR INITIALS
       ===================================================== */

    updateProfileAvatarInitials() {

        const name =
            this.state.profile.name ||
            "Job Seeker";


        const initials =
            name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map(
                    word =>
                        word.charAt(0)
                            .toUpperCase()
                )
                .join("");


        document
            .querySelectorAll(
                "[data-profile-initials]"
            )
            .forEach(element => {

                element.textContent =
                    initials;
            });
    },


    /* =====================================================
       RESUME UPLOAD
       ===================================================== */

    handleResumeUpload(event) {

        const file =
            event.target.files?.[0];

        if (!file) return;


        const allowedTypes = [

            "application/pdf",

            "application/msword",

            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        ];


        if (
            !allowedTypes.includes(
                file.type
            )
        ) {

            this.showToast(
                "Please upload a PDF or Word document.",
                "error"
            );

            event.target.value = "";

            return;
        }


        if (
            file.size >
            10 * 1024 * 1024
        ) {

            this.showToast(
                "Resume must be smaller than 10MB.",
                "error"
            );

            event.target.value = "";

            return;
        }


        if (this.elements.resumeName) {

            this.elements.resumeName.textContent =
                file.name;
        }


        localStorage.setItem(
            "jobportal_resume_name",
            file.name
        );


        this.showToast(
            "Resume selected successfully.",
            "success"
        );


        /*
        Future backend upload:

        const formData = new FormData();

        formData.append("resume", file);

        fetch("php/upload-resume.php", {
            method: "POST",
            body: formData
        });
        */
    },


    /* =====================================================
       PASSWORD TOGGLE
       ===================================================== */

    togglePassword(button) {

        const targetId =
            button.dataset.passwordToggle;

        const input =
            document.getElementById(
                targetId
            );


        if (!input) return;


        const isPassword =
            input.type === "password";


        input.type =
            isPassword
                ? "text"
                : "password";


        const icon =
            button.querySelector("i");


        if (icon) {

            icon.classList.toggle(
                "fa-eye",
                !isPassword
            );

            icon.classList.toggle(
                "fa-eye-slash",
                isPassword
            );
        }
    },


    /* =====================================================
       TOAST
       ===================================================== */

    showToast(
        message,
        type = "info"
    ) {

        const toast =
            this.elements.toast;

        if (!toast) {

            console.log(
                `[${type}] ${message}`
            );

            return;
        }


        toast.className =
            `profile-toast ${type}`;


        toast.innerHTML = `
            <span class="toast-icon">
                ${
                    type === "success"
                        ? '<i class="fa-solid fa-circle-check"></i>'
                        : type === "error"
                        ? '<i class="fa-solid fa-circle-exclamation"></i>'
                        : '<i class="fa-solid fa-circle-info"></i>'
                }
            </span>

            <span class="toast-message">
                ${this.escapeHTML(message)}
            </span>
        `;


        requestAnimationFrame(() => {

            toast.classList.add("show");

        });


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
                3000
            );
    },


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    escapeHTML(value) {

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
};


/* =========================================================
   PROFILE PAGE INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        ProfileApp.init();

    }
);


/* =========================================================
   GLOBAL HELPERS
   ========================================================= */

window.ProfileApp =
    ProfileApp;