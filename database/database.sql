-- ============================================================
-- Job Portal AI - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS job_portal;
USE job_portal;

-- Users table (job seekers & employers)
CREATE TABLE users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        ENUM('seeker', 'employer', 'admin') NOT NULL DEFAULT 'seeker',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employer profiles
CREATE TABLE employer_profiles (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL UNIQUE,
    company     VARCHAR(150),
    website     VARCHAR(255),
    description TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seeker profiles
CREATE TABLE seeker_profiles (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL UNIQUE,
    resume_path VARCHAR(255),
    skills      TEXT,
    experience  TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Job listings
CREATE TABLE jobs (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    employer_id  INT NOT NULL,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    location     VARCHAR(150),
    job_type     ENUM('full-time', 'part-time', 'contract', 'internship') DEFAULT 'full-time',
    salary       VARCHAR(100),
    status       ENUM('open', 'closed') DEFAULT 'open',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Job applications
CREATE TABLE applications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    job_id      INT NOT NULL,
    seeker_id   INT NOT NULL,
    cover_letter TEXT,
    ai_score    FLOAT DEFAULT NULL,
    status      ENUM('pending', 'reviewed', 'accepted', 'rejected') DEFAULT 'pending',
    applied_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (seeker_id) REFERENCES users(id) ON DELETE CASCADE
);
