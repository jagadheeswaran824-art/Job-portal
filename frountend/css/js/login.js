/* =========================================================
JOB PORTAL - LOGIN.JS
Advanced Authentication / Login Controller
========================================================= */

"use strict";

/* =========================================================
CONFIGURATION
========================================================= */

const LOGIN_CONFIG = {
loginEndpoint: "login.php",
defaultRedirect: "dashboard.html",
maxLoginAttempts: 5,
lockoutDuration: 60000
};

/* =========================================================
DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

```
initializeLoginPage();
```

});

/* =========================================================
INITIALIZE LOGIN PAGE
========================================================= */

function initializeLoginPage() {

```
const loginForm =
    document.querySelector(
        "#loginForm, .login-form"
    );

if (!loginForm) {
    return;
}

initializePasswordToggle();
initializeLoginValidation();
initializeLoginForm();
initializeRememberMe();
checkExistingSession();
```

}

/* =========================================================
PASSWORD VISIBILITY
========================================================= */

function initializePasswordToggle() {

```
const toggleButtons =
    document.querySelectorAll(
        "#togglePassword, .toggle-password, [data-password-toggle]"
    );

toggleButtons.forEach(button => {

    button.addEventListener("click", () => {

        const targetId =
            button.getAttribute(
                "data-target"
            );

        const input =
            targetId
                ? document.getElementById(targetId)
                : document.querySelector(
                    "#password, input[type='password']"
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

            icon.className =
                isPassword
                    ? "fas fa-eye-slash"
                    : "fas fa-eye";
        }

        button.setAttribute(
            "aria-label",
            isPassword
                ? "Hide password"
                : "Show password"
        );
    });

});
```

}

/* =========================================================
LOGIN VALIDATION
========================================================= */

function initializeLoginValidation() {

```
const emailInput =
    document.querySelector(
        "#email, #loginEmail, input[name='email']"
    );

const passwordInput =
    document.querySelector(
        "#password, #loginPassword, input[name='password']"
    );

if (emailInput) {

    emailInput.addEventListener(
        "blur",
        () => validateEmail(emailInput)
    );

    emailInput.addEventListener(
        "input",
        () => clearFieldError(emailInput)
    );
}

if (passwordInput) {

    passwordInput.addEventListener(
        "input",
        () => {

            clearFieldError(passwordInput);

            updatePasswordIndicator(
                passwordInput.value
            );
        }
    );
}
```

}

/* =========================================================
LOGIN FORM
========================================================= */

function initializeLoginForm() {

```
const form =
    document.querySelector(
        "#loginForm, .login-form"
    );

if (!form) return;

form.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        if (isLoginLocked()) {

            showLoginError(
                "Too many failed attempts. Please try again later."
            );

            return;
        }

        const emailInput =
            form.querySelector(
                "input[name='email'], #email"
            );

        const passwordInput =
            form.querySelector(
                "input[name='password'], #password"
            );

        const rememberInput =
            form.querySelector(
                "input[name='remember'], #rememberMe"
            );

        if (!emailInput || !passwordInput) {

            showLoginError(
                "Login form configuration error."
            );

            return;
        }

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;

        const remember =
            rememberInput
                ? rememberInput.checked
                : false;


        /* -----------------------------
           CLIENT VALIDATION
           ----------------------------- */

        let valid = true;

        if (!validateEmail(emailInput)) {
            valid = false;
        }

        if (!validatePassword(passwordInput)) {
            valid = false;
        }

        if (!valid) {

            showLoginError(
                "Please correct the highlighted fields."
            );

            return;
        }


        /* -----------------------------
           LOADING STATE
           ----------------------------- */

        const submitButton =
            form.querySelector(
                "button[type='submit'], input[type='submit']"
            );

        setLoginLoading(
            submitButton,
            true
        );


        try {

            const result =
                await performLogin(
                    email,
                    password
                );


            /* -------------------------
               LOGIN SUCCESS
               ------------------------- */

            if (
                result &&
                (
                    result.success === true ||
                    result.status === "success"
                )
            ) {

                clearLoginAttempts();

                storeAuthentication(
                    result,
                    remember
                );

                showLoginSuccess(
                    result.message ||
                    "Login successful!"
                );


                const redirectUrl =
                    getRedirectURL(
                        result.user
                    );

                setTimeout(() => {

                    window.location.href =
                        redirectUrl;

                }, 700);

                return;
            }


            /* -------------------------
               LOGIN FAILED
               ------------------------- */

            registerFailedAttempt();

            showLoginError(
                result?.message ||
                "Invalid email or password."
            );


        } catch (error) {

            console.error(
                "Login Error:",
                error
            );

            registerFailedAttempt();

            showLoginError(
                "Unable to connect to the server. Please try again."
            );

        } finally {

            setLoginLoading(
                submitButton,
                false
            );
        }

    }
);
```

}

/* =========================================================
API LOGIN
========================================================= */

async function performLogin(
email,
password
) {

```
const response =
    await fetch(
        LOGIN_CONFIG.loginEndpoint,
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
                email,
                password
            })
        }
    );


let data;

try {

    data =
        await response.json();

} catch {

    throw new Error(
        "Invalid server response."
    );
}


if (!response.ok) {

    return {
        success: false,
        message:
            data.message ||
            "Login failed."
    };
}

return data;
```

}

/* =========================================================
STORE AUTHENTICATION DATA
========================================================= */

function storeAuthentication(
result,
remember
) {

```
const user =
    result.user || result.data?.user;

const token =
    result.token ||
    result.access_token ||
    result.data?.token;


if (user) {

    /*
     * Only store non-sensitive user information.
     * Never store the password.
     */

    const safeUser = {
        id: user.id,
        name:
            user.name ||
            user.username ||
            "",
        username:
            user.username ||
            "",
        email:
            user.email ||
            "",
        role:
            user.role ||
            "job_seeker"
    };

    localStorage.setItem(
        "jobPortalUser",
        JSON.stringify(safeUser)
    );
}


if (token) {

    /*
     * For a real production application,
     * prefer secure HttpOnly cookies for tokens.
     */

    if (remember) {

        localStorage.setItem(
            "jobPortalToken",
            token
        );

    } else {

        sessionStorage.setItem(
            "jobPortalToken",
            token
        );
    }
}


if (remember) {

    localStorage.setItem(
        "jobPortalRemember",
        "true"
    );

} else {

    localStorage.removeItem(
        "jobPortalRemember"
    );
}
```

}

/* =========================================================
REDIRECT MANAGEMENT
========================================================= */

function getRedirectURL(user) {

```
const requestedRedirect =
    getQueryParam(
        "redirect"
    );


/*
 * Only allow local paths.
 * Prevent open-redirect attacks.
 */

if (
    requestedRedirect &&
    requestedRedirect.startsWith("/") &&
    !requestedRedirect.startsWith("//")
) {

    return requestedRedirect;
}


const role =
    user?.role ||
    "job_seeker";


switch (role) {

    case "admin":
        return "admin/dashboard.html";

    case "recruiter":
        return "dashboard.html";

    case "job_seeker":
    default:
        return LOGIN_CONFIG.defaultRedirect;
}
```

}

/* =========================================================
EXISTING SESSION CHECK
========================================================= */

function checkExistingSession() {

```
const user =
    typeof getCurrentUser === "function"
        ? getCurrentUser()
        : null;

if (!user) return;


const currentPage =
    window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();


if (currentPage === "login.html") {

    /*
     * User is already authenticated.
     * Don't force redirect if they intentionally
     * opened the login page, but offer a dashboard.
     */

    const loggedInMessage =
        document.querySelector(
            "#alreadyLoggedIn, .already-logged-in"
        );

    if (loggedInMessage) {

        loggedInMessage.innerHTML = `
            You are already logged in.
            <a href="${getRedirectURL(user)}">
                Go to Dashboard
            </a>
        `;
    }
}
```

}

/* =========================================================
REMEMBER ME
========================================================= */

function initializeRememberMe() {

```
const checkbox =
    document.querySelector(
        "#rememberMe, input[name='remember']"
    );

if (!checkbox) return;

checkbox.checked =
    localStorage.getItem(
        "jobPortalRemember"
    ) === "true";
```

}

/* =========================================================
EMAIL VALIDATION
========================================================= */

function validateEmail(input) {

```
if (!input) return false;

const email =
    input.value.trim();

const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


if (!email) {

    setFieldError(
        input,
        "Email address is required."
    );

    return false;
}


if (!emailPattern.test(email)) {

    setFieldError(
        input,
        "Enter a valid email address."
    );

    return false;
}


clearFieldError(input);

return true;
```

}

/* =========================================================
PASSWORD VALIDATION
========================================================= */

function validatePassword(input) {

```
if (!input) return false;

const password =
    input.value;


if (!password) {

    setFieldError(
        input,
        "Password is required."
    );

    return false;
}


if (password.length < 6) {

    setFieldError(
        input,
        "Password must contain at least 6 characters."
    );

    return false;
}


clearFieldError(input);

return true;
```

}

/* =========================================================
PASSWORD STRENGTH INDICATOR
========================================================= */

function updatePasswordIndicator(
password
) {

```
const indicator =
    document.querySelector(
        "#passwordStrength, .password-strength"
    );

if (!indicator) return;


if (!password) {

    indicator.textContent = "";

    indicator.className =
        "password-strength";

    return;
}


let score = 0;


if (password.length >= 8) {
    score++;
}

if (/[A-Z]/.test(password)) {
    score++;
}

if (/[a-z]/.test(password)) {
    score++;
}

if (/[0-9]/.test(password)) {
    score++;
}

if (/[^A-Za-z0-9]/.test(password)) {
    score++;
}


const levels = [
    {
        text: "Very weak",
        className: "very-weak"
    },
    {
        text: "Weak",
        className: "weak"
    },
    {
        text: "Fair",
        className: "fair"
    },
    {
        text: "Strong",
        className: "strong"
    },
    {
        text: "Very strong",
        className: "very-strong"
    }
];


const level =
    levels[Math.min(score, 4)];


indicator.textContent =
    level.text;

indicator.className =
    `password-strength ${level.className}`;
```

}

/* =========================================================
FIELD ERROR HANDLING
========================================================= */

function setFieldError(
input,
message
) {

```
input.classList.add(
    "input-error"
);

input.setAttribute(
    "aria-invalid",
    "true"
);


let errorElement =
    input.parentElement?.querySelector(
        ".field-error"
    );


if (!errorElement) {

    errorElement =
        document.createElement(
            "small"
        );

    errorElement.className =
        "field-error";

    input.parentElement?.appendChild(
        errorElement
    );
}


errorElement.textContent =
    message;
```

}

function clearFieldError(
input
) {

```
if (!input) return;

input.classList.remove(
    "input-error"
);

input.removeAttribute(
    "aria-invalid"
);


const errorElement =
    input.parentElement?.querySelector(
        ".field-error"
    );


if (errorElement) {
    errorElement.textContent = "";
}
```

}

/* =========================================================
LOGIN MESSAGES
========================================================= */

function showLoginError(
message
) {

```
const container =
    document.querySelector(
        "#loginMessage, .login-message"
    );


if (container) {

    container.className =
        "login-message error";

    container.textContent =
        message;

    container.style.display =
        "block";

    return;
}


if (typeof showToast === "function") {

    showToast(
        message,
        "error"
    );
}
```

}

function showLoginSuccess(
message
) {

```
const container =
    document.querySelector(
        "#loginMessage, .login-message"
    );


if (container) {

    container.className =
        "login-message success";

    container.textContent =
        message;

    container.style.display =
        "block";

    return;
}


if (typeof showToast === "function") {

    showToast(
        message,
        "success"
    );
}
```

}

/* =========================================================
SUBMIT BUTTON LOADING
========================================================= */

function setLoginLoading(
button,
loading
) {

```
if (!button) return;


if (loading) {

    button.disabled = true;

    button.dataset.originalText =
        button.innerHTML;

    button.innerHTML = `
        <span class="spinner"></span>
        Signing in...
    `;

} else {

    button.disabled = false;

    if (button.dataset.originalText) {

        button.innerHTML =
            button.dataset.originalText;
    }
}
```

}

/* =========================================================
FAILED LOGIN ATTEMPTS
========================================================= */

function registerFailedAttempt() {

```
let attempts =
    Number(
        sessionStorage.getItem(
            "jobPortalLoginAttempts"
        ) || 0
    );


attempts++;

sessionStorage.setItem(
    "jobPortalLoginAttempts",
    String(attempts)
);


if (
    attempts >=
    LOGIN_CONFIG.maxLoginAttempts
) {

    sessionStorage.setItem(
        "jobPortalLoginLockedUntil",
        String(
            Date.now() +
            LOGIN_CONFIG.lockoutDuration
        )
    );
}
```

}

function clearLoginAttempts() {

```
sessionStorage.removeItem(
    "jobPortalLoginAttempts"
);

sessionStorage.removeItem(
    "jobPortalLoginLockedUntil"
);
```

}

function isLoginLocked() {

```
const lockedUntil =
    Number(
        sessionStorage.getItem(
            "jobPortalLoginLockedUntil"
        ) || 0
    );


if (!lockedUntil) {
    return false;
}


if (Date.now() >= lockedUntil) {

    clearLoginAttempts();

    return false;
}


return true;
```

}

/* =========================================================
GLOBAL EXPORT
========================================================= */

window.JobPortalLogin = {

```
login: performLogin,

validateEmail,

validatePassword,

getRedirectURL,

clearLoginAttempts,

isLoginLocked
```

}
