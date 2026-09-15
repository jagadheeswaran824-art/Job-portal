# Job Portal

A full-stack job portal application where job seekers can find and apply for jobs, employers can post and manage listings, and admins can oversee the platform. Built with Node.js, Express, MySQL, and vanilla HTML/CSS/JS.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Default Accounts](#default-accounts)
- [Deployment](#deployment)

---

## Features

### Job Seekers
- Browse and search job listings with filters (category, location, job type, experience level)
- Apply to jobs with a cover letter
- Track application status (pending → reviewing → shortlisted → interview → offered / rejected)
- Save and unsave job listings
- Build a full profile: bio, skills, work experience, and education
- View a personal dashboard with application stats and recent activity

### Employers
- Post, edit, and delete job listings
- Set job details: salary range, skills required, benefits, deadline
- View all applicants for each listing with contact information
- Update applicant status through the hiring pipeline

### Admins
- Full access to manage users and listings
- Ban or activate user accounts
- Oversee all jobs and applications across the platform

### General
- JWT-based authentication with role-based access control
- Featured job listings with view tracking
- Responsive frontend served directly by the Node.js backend
- Health check endpoint for uptime monitoring

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express 4 |
| Database | MySQL (via mysql2 connection pool) |
| Authentication | JWT (jsonwebtoken), bcryptjs |
| File Uploads | Multer |
| Frontend | Vanilla HTML5, CSS3, JavaScript |
| Dev Server | Nodemon |
| Deployment | Vercel |

> The repository also contains a legacy PHP backend and a Python/Flask AI module stub. Neither is wired to the active Node.js server — the Node.js layer is the live implementation.

---

## Project Structure

```
Job Portal/
├── backend/
│   ├── server.js               # Express app entry point (port 5000)
│   ├── db.js                   # MySQL2 connection pool
│   ├── .env.example            # Environment variable template
│   ├── package.json
│   ├── routes/
│   │   ├── auth.js             # /api/auth
│   │   ├── jobs.js             # /api/jobs
│   │   ├── applications.js     # /api/applications
│   │   ├── profile.js          # /api/profile
│   │   ├── savedJobs.js        # /api/saved-jobs
│   │   └── dashboard.js        # /api/dashboard
│   ├── middleware/
│   │   └── auth.js             # JWT verification middleware
│   └── database/
│       └── setup.js            # One-time DB setup and seed script
│
├── frountend/                  # Static frontend (served by Express)
│   ├── index.html              # Landing page
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── jobs.html
│   ├── job-details.html
│   ├── post-job.html
│   ├── profile.html
│   ├── companies.html
│   ├── company-details.html
│   ├── about.html
│   ├── career.html
│   ├── css/                    # Stylesheets
│   └── js/
│       └── api.js              # Centralized API client + session helpers
│
├── vercel.json                 # Vercel deployment config
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **MySQL** (local or cloud — PlanetScale, Railway, etc.)

### 1. Clone the repo

```bash
git clone <repository-url>
cd "Job Portal"
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in your database credentials and JWT secret (see [Environment Variables](#environment-variables)).

### 3. Install dependencies

```bash
cd backend
npm install
```

### 4. Set up the database

Run the setup script once to create all tables and seed test data:

```bash
node database/setup.js
```

This creates 10 tables and seeds 3 test accounts and 6 sample job listings.

### 5. Start the server

```bash
# Production
npm start

# Development (auto-reload on file changes)
npm run dev
```

The server starts on **port 5000** by default.

| URL | Description |
|---|---|
| http://localhost:5000 | Frontend |
| http://localhost:5000/api | API base |
| http://localhost:5000/api/health | Health check |

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and set the following:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=job_portal
DB_USERNAME=root
DB_PASSWORD=
DB_SSL_MODE=          # Set to REQUIRED for cloud databases

# Auth
JWT_SECRET=your-super-secret-jwt-key-change-this

# Server
PORT=5000

# File Storage
MAX_FILE_SIZE=5242880  # 5 MB in bytes
```

---

## API Reference

All endpoints are prefixed with `/api`.

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Register a new user (`job_seeker` or `employer`) |
| POST | `/login` | No | Login and receive a JWT |
| GET | `/me` | Yes | Get the currently logged-in user |
| POST | `/logout` | Yes | Logout (client clears token) |

### Jobs — `/api/jobs`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | No | List jobs (paginated, filterable) |
| GET | `/featured` | No | Get featured job listings |
| GET | `/:id` | No | Get a single job (increments view count) |
| POST | `/` | Employer/Admin | Post a new job |
| PUT | `/:id` | Owner/Admin | Update a job |
| DELETE | `/:id` | Owner/Admin | Delete a job |

**Query parameters for `GET /`:** `search`, `category`, `location`, `job_type`, `experience_level`, `page`, `per_page`

### Applications — `/api/applications`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/my` | Job Seeker | Get your own applications |
| GET | `/job/:jobId` | Employer | Get all applicants for a job |
| POST | `/` | Job Seeker | Apply for a job |
| PATCH | `/:id/status` | Employer/Admin | Update application status |
| DELETE | `/:id` | Job Seeker | Withdraw an application |

### Profile — `/api/profile`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | Get full profile (user + skills + experience + education) |
| PUT | `/` | Yes | Update profile |
| POST | `/skills` | Yes | Add a skill |
| DELETE | `/skills/:id` | Yes | Remove a skill |
| POST | `/experience` | Yes | Add work experience |
| DELETE | `/experience/:id` | Yes | Remove work experience |
| POST | `/education` | Yes | Add education entry |
| DELETE | `/education/:id` | Yes | Remove education entry |

### Saved Jobs — `/api/saved-jobs`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | List saved jobs |
| POST | `/` | Yes | Save a job |
| DELETE | `/:jobId` | Yes | Remove a saved job |
| GET | `/check/:jobId` | Yes | Check if a job is saved |

### Dashboard — `/api/dashboard`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/overview` | Yes | Stats, recent applications, and notifications |

---

## Default Accounts

After running `node database/setup.js`, these accounts are available:

| Role | Email | Password |
|---|---|---|
| Admin | admin@jobportal.com | Admin@1234 |
| Employer | employer@jobportal.com | Employer@1234 |
| Job Seeker | jagad@jobportal.com | Seeker@1234 |

> Change these credentials in a production environment.

---

## Deployment

The project includes a `vercel.json` that routes `/api/*` to `backend/server.js` (via `@vercel/node`) and serves the `frountend/` directory as static assets.

To deploy to Vercel:

1. Push the repository to GitHub.
2. Import the project in [vercel.com](https://vercel.com).
3. Add the following environment variables in the Vercel project settings:
   - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `DB_SSL_MODE`
   - `JWT_SECRET`
4. Deploy.

For cloud databases, set `DB_SSL_MODE=REQUIRED` in your environment variables.
#   J o b - p o r t a l  
 #   J o b - p o r t a l  
 