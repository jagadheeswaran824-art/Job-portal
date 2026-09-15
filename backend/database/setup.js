/**
 * Database Setup Script
 * Run once: node database/setup.js
 * Creates all tables and seeds test data.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setup() {
    console.log('\n🔌 Connecting to database...');
    console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
    console.log(`   DB  : ${process.env.DB_DATABASE}\n`);

    const db = await mysql.createConnection({
        host:               process.env.DB_HOST,
        port:               parseInt(process.env.DB_PORT) || 3306,
        user:               process.env.DB_USERNAME,
        password:           process.env.DB_PASSWORD,
        database:           process.env.DB_DATABASE,
        ssl:                process.env.DB_SSL_MODE === 'REQUIRED' ? { rejectUnauthorized: false } : false,
        multipleStatements: true,
    });

    console.log('✅ Connected!\n');
    console.log('📦 Creating tables...\n');

    // ── Users ──────────────────────────────────────────────────────────────────
    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            full_name           VARCHAR(100)  NOT NULL,
            email               VARCHAR(150)  NOT NULL UNIQUE,
            password            VARCHAR(255)  NOT NULL,
            role                ENUM('admin','employer','job_seeker') DEFAULT 'job_seeker',
            phone               VARCHAR(20),
            avatar              VARCHAR(255),
            status              ENUM('active','inactive','banned') DEFAULT 'active',
            email_verified_at   DATETIME DEFAULT NULL,
            created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            INDEX idx_role  (role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ users');

    // ── Profiles ───────────────────────────────────────────────────────────────
    await db.query(`
        CREATE TABLE IF NOT EXISTS profiles (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            user_id             INT NOT NULL UNIQUE,
            bio                 TEXT,
            headline            VARCHAR(200),
            location            VARCHAR(100),
            website             VARCHAR(255),
            linkedin            VARCHAR(255),
            github              VARCHAR(255),
            experience_years    INT DEFAULT 0,
            expected_salary     DECIMAL(12,2),
            resume_path         VARCHAR(255),
            created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ profiles');

    // ── Profile Skills ─────────────────────────────────────────────────────────
    await db.query(`
        CREATE TABLE IF NOT EXISTS profile_skills (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            user_id             INT NOT NULL,
            skill_name          VARCHAR(100) NOT NULL,
            proficiency_level   ENUM('beginner','intermediate','advanced','expert') DEFAULT 'intermediate',
            created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ profile_skills');

    // ── Profile Experience ─────────────────────────────────────────────────────
    await db.query(`
        CREATE TABLE IF NOT EXISTS profile_experience (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            user_id             INT NOT NULL,
            company             VARCHAR(150) NOT NULL,
            position            VARCHAR(150) NOT NULL,
            description         TEXT,
            start_date          DATE NOT NULL,
            end_date            DATE,
            is_current          TINYINT(1) DEFAULT 0,
            created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ profile_experience');

    // ── Profile Education ──────────────────────────────────────────────────────
    await db.query(`
        CREATE TABLE IF NOT EXISTS profile_education (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            user_id             INT NOT NULL,
            institution         VARCHAR(200) NOT NULL,
            degree              VARCHAR(150) NOT NULL,
            field_of_study      VARCHAR(150),
            start_date          DATE,
            end_date            DATE,
            created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ profile_education');

    // ── Jobs ───────────────────────────────────────────────────────────────────
    // NOTE: 'hybrid' is stored as a separate value — use 'remote' enum + location label
    await db.query(`
        CREATE TABLE IF NOT EXISTS jobs (
            id                   INT AUTO_INCREMENT PRIMARY KEY,
            user_id              INT NOT NULL,
            title                VARCHAR(200) NOT NULL,
            description          TEXT NOT NULL,
            company_name         VARCHAR(150) NOT NULL,
            location             VARCHAR(150) NOT NULL,
            job_type             ENUM('full-time','part-time','contract','internship','freelance','remote') DEFAULT 'full-time',
            category             VARCHAR(100) DEFAULT 'general',
            experience_level     ENUM('entry','junior','mid','senior','lead','manager') DEFAULT 'mid',
            salary_min           DECIMAL(12,2),
            salary_max           DECIMAL(12,2),
            skills               JSON,
            requirements         TEXT,
            benefits             TEXT,
            application_deadline DATE,
            status               ENUM('active','inactive','closed','draft') DEFAULT 'active',
            is_featured          TINYINT(1) DEFAULT 0,
            views                INT DEFAULT 0,
            created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_status   (status),
            INDEX idx_category (category),
            INDEX idx_featured (is_featured),
            INDEX idx_user     (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ jobs');

    // ── Applications ───────────────────────────────────────────────────────────
    await db.query(`
        CREATE TABLE IF NOT EXISTS applications (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            user_id       INT NOT NULL,
            job_id        INT NOT NULL,
            cover_letter  TEXT,
            resume_path   VARCHAR(255),
            status        ENUM('pending','reviewing','shortlisted','interview','offered','rejected','withdrawn') DEFAULT 'pending',
            notes         TEXT,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_user_job (user_id, job_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (job_id)  REFERENCES jobs(id)  ON DELETE CASCADE,
            INDEX idx_user_status (user_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ applications');

    // ── Saved Jobs ─────────────────────────────────────────────────────────────
    await db.query(`
        CREATE TABLE IF NOT EXISTS saved_jobs (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT NOT NULL,
            job_id     INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_saved (user_id, job_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (job_id)  REFERENCES jobs(id)  ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ saved_jobs');

    // ── Notifications ──────────────────────────────────────────────────────────
    await db.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT NOT NULL,
            type       VARCHAR(50)  NOT NULL,
            title      VARCHAR(200) NOT NULL,
            message    TEXT,
            data       JSON,
            is_read    TINYINT(1) DEFAULT 0,
            read_at    DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_read (user_id, is_read)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ notifications');

    // ── Token Blacklist ────────────────────────────────────────────────────────
    await db.query(`
        CREATE TABLE IF NOT EXISTS token_blacklist (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            token      TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ token_blacklist');

    // ═══════════════════════════════════════════════════════════════════════════
    // SEED DATA
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n🌱 Seeding users...');

    const adminHash   = await bcrypt.hash('Admin@1234',    12);
    const empHash     = await bcrypt.hash('Employer@1234', 12);
    const emp2Hash    = await bcrypt.hash('Employer@1234', 12);
    const seekerHash  = await bcrypt.hash('Seeker@1234',   12);

    await db.query(`INSERT IGNORE INTO users (full_name, email, password, role, status) VALUES
        ('Admin',            'admin@jobportal.com',    ?, 'admin',      'active'),
        ('TechNova HR',      'employer@jobportal.com', ?, 'employer',   'active'),
        ('CloudWorks HR',    'employer2@jobportal.com',?, 'employer',   'active'),
        ('Jagadheeswaran V', 'jagad@jobportal.com',    ?, 'job_seeker', 'active')
    `, [adminHash, empHash, emp2Hash, seekerHash]);

    console.log('   ✔ 4 users seeded');

    // Fetch employer IDs
    const [emp1Rows] = await db.query(`SELECT id FROM users WHERE email='employer@jobportal.com'`);
    const [emp2Rows] = await db.query(`SELECT id FROM users WHERE email='employer2@jobportal.com'`);
    const empId  = emp1Rows[0].id;
    const emp2Id = emp2Rows[0].id;

    // Seed profiles
    await db.query(`INSERT IGNORE INTO profiles (user_id, headline, location, experience_years) VALUES
        (${empId},  'Senior HR at TechNova Solutions', 'Chennai, Tamil Nadu', 5),
        (${emp2Id}, 'Head of Talent at CloudWorks',    'Bangalore, Karnataka', 8)
    `);

    // ── Seed Jobs ──────────────────────────────────────────────────────────────
    console.log('\n🌱 Seeding sample jobs...');

    const req1 = 'Bachelor\'s degree in Computer Science or related field\nStrong problem-solving skills\nGood communication skills\nAbility to work in a team';
    const ben1 = 'Health insurance\nFlexible working hours\nWork from home options\nAnnual performance bonus\nLearning & development budget';

    const jobs = [
        // [user_id, title, description, company, location, type, category, level, min, max, skills, featured, requirements, benefits]
        [empId,  'Frontend Developer',
            'We are looking for a passionate Frontend Developer to join our growing team. You will build responsive, accessible web interfaces using modern JavaScript frameworks. Work closely with designers and backend engineers to deliver exceptional user experiences.',
            'TechNova Solutions', 'Chennai', 'full-time', 'frontend', 'junior',
            500000, 800000, JSON.stringify(['React','JavaScript','CSS','HTML','TypeScript']), 1, req1, ben1],

        [empId, 'Full Stack Developer',
            'Join CloudWorks as a Full Stack Developer and work on exciting cloud-based projects. You will design, develop and maintain both frontend and backend systems serving thousands of users daily.',
            'CloudWorks', 'Bangalore', 'full-time', 'fullstack', 'mid',
            700000, 1200000, JSON.stringify(['Node.js','React','MySQL','Express','AWS']), 1, req1, ben1],

        [emp2Id, 'Python AI Developer',
            'Build cutting-edge AI models and production-grade REST APIs using Python and machine learning frameworks. This is a senior role working on real AI products used by enterprise customers.',
            'AI Innovations', 'Hyderabad', 'remote', 'ai-ml', 'senior',
            800000, 1400000, JSON.stringify(['Python','TensorFlow','Flask','SQL','Docker']), 1, req1, ben1],

        [emp2Id, 'React Native Developer',
            'Create high-performance cross-platform mobile applications used by millions. You will own the mobile engineering roadmap and collaborate closely with product and design teams.',
            'MobiTech', 'Remote', 'remote', 'mobile', 'mid',
            600000, 1000000, JSON.stringify(['React Native','JavaScript','Redux','TypeScript']), 1, req1, ben1],

        [empId, 'Backend Engineer',
            'Design and build scalable, resilient REST APIs and microservices. You will be responsible for performance, security and reliability of core backend systems.',
            'DataTech', 'Pune', 'full-time', 'backend', 'senior',
            900000, 1500000, JSON.stringify(['Node.js','PostgreSQL','Redis','AWS','Docker']), 1, req1, ben1],

        [emp2Id, 'UI/UX Designer',
            'Design beautiful, user-centric product experiences from wireframe to production. You will conduct user research, create prototypes and work directly with engineering teams.',
            'DesignHub', 'Mumbai', 'full-time', 'design', 'mid',
            500000, 900000, JSON.stringify(['Figma','Adobe XD','Prototyping','User Research']), 1, req1, ben1],

        [empId, 'DevOps Engineer',
            'Own our CI/CD pipelines, cloud infrastructure and monitoring. You will automate deployments, improve reliability and drive our infrastructure-as-code initiatives.',
            'TechNova Solutions', 'Bangalore', 'full-time', 'devops', 'senior',
            1000000, 1600000, JSON.stringify(['AWS','Kubernetes','Terraform','Docker','Jenkins']), 0, req1, ben1],

        [emp2Id, 'Data Analyst',
            'Turn complex data into actionable insights. You will build dashboards, create reports and work with product and business teams to drive data-informed decisions.',
            'CloudWorks', 'Chennai', 'full-time', 'data', 'junior',
            400000, 700000, JSON.stringify(['SQL','Python','Tableau','Excel','Power BI']), 0, req1, ben1],

        [empId, 'Java Developer',
            'Develop enterprise-grade Java applications and RESTful services. Work on large-scale systems with modern Spring Boot architecture.',
            'EnterpriseSoft', 'Noida', 'full-time', 'backend', 'mid',
            600000, 1100000, JSON.stringify(['Java','Spring Boot','Microservices','MySQL','Maven']), 0, req1, ben1],

        [emp2Id, 'Product Manager',
            'Lead cross-functional teams to ship great products. Define roadmap, gather requirements, prioritise features and communicate clearly with all stakeholders.',
            'StartupHub', 'Bangalore', 'full-time', 'management', 'senior',
            1200000, 2000000, JSON.stringify(['Product Strategy','Agile','Jira','Analytics','Roadmapping']), 0, req1, ben1],

        [empId, 'QA Engineer',
            'Ensure product quality through manual and automated testing. Build robust test frameworks and work closely with developers to prevent regressions.',
            'QualityFirst', 'Hyderabad', 'full-time', 'qa', 'mid',
            500000, 900000, JSON.stringify(['Selenium','Jest','API Testing','SQL','Cypress']), 0, req1, ben1],

        [emp2Id, 'iOS Developer',
            'Build native iOS applications with a focus on performance and user experience. You will own the iOS codebase and drive adoption of modern Swift patterns.',
            'MobiTech', 'Chennai', 'full-time', 'mobile', 'mid',
            700000, 1200000, JSON.stringify(['Swift','Xcode','iOS SDK','Core Data','REST APIs']), 0, req1, ben1],
    ];

    let inserted = 0;
    for (const j of jobs) {
        const [r] = await db.query(`
            INSERT IGNORE INTO jobs
                (user_id, title, description, company_name, location, job_type, category,
                 experience_level, salary_min, salary_max, skills, status, is_featured,
                 views, requirements, benefits, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,'active',?,?,?,?,NOW())
        `, [...j.slice(0,11), j[11], Math.floor(Math.random()*500), j[12], j[13]]);
        if (r.affectedRows) inserted++;
    }
    console.log(`   ✔ ${inserted} jobs seeded`);

    await db.end();

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   ✅  Database setup complete!              ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log('║  Start server:  node server.js              ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log('  Test accounts:');
    console.log('  👑 Admin    →  admin@jobportal.com     /  Admin@1234');
    console.log('  🏢 Employer →  employer@jobportal.com  /  Employer@1234');
    console.log('  👤 Seeker   →  jagad@jobportal.com     /  Seeker@1234\n');
}

setup().catch(err => {
    console.error('\n❌ Setup failed:', err.message);
    process.exit(1);
});
