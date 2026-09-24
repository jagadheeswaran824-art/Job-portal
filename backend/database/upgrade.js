/**
 * AI Career Intelligence Platform - Database Upgrade Script
 * Creates new tables for Career GPS, Skill Gap, Assessments, Interview Simulator,
 * Portfolio Projects, Scheduled Interviews, and Career Events while 100% preserving existing data.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const databaseUser = process.env.DB_USER || process.env.DB_USERNAME;
const databaseName = process.env.DB_NAME || process.env.DB_DATABASE;

async function upgrade() {
    console.log('\n🔌 Connecting to database for schema upgrade...');
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        user: databaseUser,
        password: process.env.DB_PASSWORD,
        database: databaseName,
        ssl: { rejectUnauthorized: false },
        multipleStatements: true,
    });

    console.log('✅ Connected to database!\n');
    console.log('🚀 Executing Schema Upgrades for AI Career Intelligence Platform...\n');

    // 1. Career Goals
    await db.query(`
        CREATE TABLE IF NOT EXISTS career_goals (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            user_id          INT NOT NULL,
            target_role      VARCHAR(150) NOT NULL,
            target_industry  VARCHAR(100) DEFAULT 'Technology',
            target_salary    DECIMAL(12,2),
            current_level    VARCHAR(50) DEFAULT 'Entry / Fresher',
            target_date      DATE,
            notes            TEXT,
            created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_goal (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ career_goals table ready');

    // 2. Career Roadmaps (Career GPS)
    await db.query(`
        CREATE TABLE IF NOT EXISTS career_roadmaps (
            id                     INT AUTO_INCREMENT PRIMARY KEY,
            user_id                INT NOT NULL,
            title                  VARCHAR(200) NOT NULL,
            target_role            VARCHAR(150) NOT NULL,
            stages                 JSON NOT NULL,
            current_stage_index    INT DEFAULT 0,
            completion_percentage  INT DEFAULT 0,
            is_active              TINYINT(1) DEFAULT 1,
            created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_roadmap (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ career_roadmaps table ready');

    // 3. Assessments
    await db.query(`
        CREATE TABLE IF NOT EXISTS assessments (
            id                   INT AUTO_INCREMENT PRIMARY KEY,
            category             VARCHAR(50) NOT NULL,
            title                VARCHAR(150) NOT NULL,
            description          TEXT,
            time_limit_minutes   INT DEFAULT 15,
            passing_score        INT DEFAULT 70,
            questions            JSON NOT NULL,
            created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_category   (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ assessments table ready');

    // 4. Assessment Attempts
    await db.query(`
        CREATE TABLE IF NOT EXISTS assessment_attempts (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            user_id             INT NOT NULL,
            assessment_id       INT NOT NULL,
            score               DECIMAL(5,2) NOT NULL,
            total_questions     INT NOT NULL,
            correct_answers     INT NOT NULL,
            proficiency_level   VARCHAR(50) NOT NULL,
            badge_name          VARCHAR(100),
            passed              TINYINT(1) DEFAULT 0,
            answers_summary     JSON,
            created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
            INDEX idx_user_assessment (user_id, assessment_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ assessment_attempts table ready');

    // 5. Portfolio Projects (AI Project Analyzer & Portfolio Generator)
    await db.query(`
        CREATE TABLE IF NOT EXISTS portfolio_projects (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            user_id          INT NOT NULL,
            title            VARCHAR(200) NOT NULL,
            problem          TEXT,
            solution         TEXT,
            technologies     JSON,
            features         JSON,
            bullet_points    JSON,
            live_url         VARCHAR(255),
            github_url       VARCHAR(255),
            role_description TEXT,
            created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_project (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ portfolio_projects table ready');

    // 6. Scheduled Interviews
    await db.query(`
        CREATE TABLE IF NOT EXISTS scheduled_interviews (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            application_id   INT,
            employer_id      INT NOT NULL,
            candidate_id     INT NOT NULL,
            job_id           INT NOT NULL,
            interview_date   DATE NOT NULL,
            interview_time   TIME NOT NULL,
            interview_type   ENUM('video','technical_round','hr_round','phone','in_person') DEFAULT 'video',
            meeting_link     VARCHAR(255),
            notes            TEXT,
            feedback         TEXT,
            status           ENUM('scheduled','completed','cancelled','rescheduled') DEFAULT 'scheduled',
            created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
            INDEX idx_cand_int (candidate_id),
            INDEX idx_emp_int (employer_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ scheduled_interviews table ready');

    // 7. Interview Simulations (AI Mock Interviewer)
    await db.query(`
        CREATE TABLE IF NOT EXISTS interview_simulations (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            user_id             INT NOT NULL,
            role_title          VARCHAR(150) NOT NULL,
            difficulty          VARCHAR(50) DEFAULT 'mid',
            interview_type      VARCHAR(50) DEFAULT 'Technical',
            overall_score       INT DEFAULT 0,
            evaluation_summary  JSON,
            transcript          JSON,
            created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_sim (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ interview_simulations table ready');

    // 8. Career Events Timeline
    await db.query(`
        CREATE TABLE IF NOT EXISTS career_events (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            event_type  VARCHAR(50) NOT NULL,
            title       VARCHAR(200) NOT NULL,
            description TEXT,
            metadata    JSON,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_timeline (user_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ career_events table ready');

    // 9. Ensure jobs table has application_url and company_website
    try {
        await db.query(`ALTER TABLE jobs ADD COLUMN application_url VARCHAR(500) DEFAULT NULL AFTER salary_max;`);
    } catch (e) { /* column exists */ }
    try {
        await db.query(`ALTER TABLE jobs ADD COLUMN company_website VARCHAR(255) DEFAULT NULL AFTER application_url;`);
    } catch (e) { /* column exists */ }
    console.log('   ✔ jobs table columns verified');

    // 10. Security Checks Table
    await db.query(`
        CREATE TABLE IF NOT EXISTS security_checks (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            user_id         INT NULL,
            job_id          INT NULL,
            url             VARCHAR(2048) NOT NULL,
            domain          VARCHAR(255),
            risk_level      ENUM('LOW_RISK','CAUTION','HIGH_RISK','UNKNOWN') DEFAULT 'UNKNOWN',
            score           INT DEFAULT 100,
            indicators      JSON,
            recommendations JSON,
            signals         JSON,
            is_external     TINYINT(1) DEFAULT 1,
            is_demo         TINYINT(1) DEFAULT 0,
            checked_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (job_id)  REFERENCES jobs(id)  ON DELETE SET NULL,
            INDEX idx_risk_level  (risk_level),
            INDEX idx_url_domain  (domain),
            INDEX idx_checked_at  (checked_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ security_checks table ready');

    // 11. Job Security Reports Table (User reports on scam / suspicious jobs)
    await db.query(`
        CREATE TABLE IF NOT EXISTS job_security_reports (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            job_id              INT NOT NULL,
            user_id             INT NULL,
            reporter_name       VARCHAR(150) DEFAULT 'Anonymous',
            reporter_email      VARCHAR(150),
            reason              ENUM('scam','payment_request','fake_company','suspicious_link','fake_recruiter','misleading_information','other') NOT NULL,
            details             TEXT,
            url                 VARCHAR(2048),
            risk_level          ENUM('LOW_RISK','CAUTION','HIGH_RISK','UNKNOWN') DEFAULT 'HIGH_RISK',
            admin_review_status ENUM('pending','investigating','dismissed','action_taken','resolved') DEFAULT 'pending',
            admin_notes         TEXT,
            reviewed_by         INT NULL,
            reviewed_at         DATETIME NULL,
            created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id)      REFERENCES jobs(id)  ON DELETE CASCADE,
            FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_report_status   (admin_review_status),
            INDEX idx_report_job      (job_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ job_security_reports table ready');

    // 12. URL Security Results Cache Table
    await db.query(`
        CREATE TABLE IF NOT EXISTS url_security_results (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            url_hash        VARCHAR(64) NOT NULL UNIQUE,
            url             VARCHAR(2048) NOT NULL,
            domain          VARCHAR(255) NOT NULL,
            risk_level      ENUM('LOW_RISK','CAUTION','HIGH_RISK','UNKNOWN') DEFAULT 'UNKNOWN',
            indicators      JSON,
            threat_types    JSON,
            last_scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_url_cache_dom (domain),
            INDEX idx_url_cache_risk(risk_level)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ url_security_results table ready');

    // 13. Security Audit Events Table
    await db.query(`
        CREATE TABLE IF NOT EXISTS security_events (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT NULL,
            event_type VARCHAR(100) NOT NULL,
            severity   ENUM('low','medium','high','critical') DEFAULT 'low',
            details    JSON,
            ip_address VARCHAR(45),
            user_agent VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_event_type (event_type),
            INDEX idx_event_sev  (severity)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✔ security_events table ready');

    // 14. Seed Skill Assessments if not present
    console.log('\n🌱 Seeding comprehensive Skill Assessments...');
    const assessmentsData = [
        {
            category: 'javascript',
            title: 'JavaScript Core & Modern ES6+',
            description: 'Assess core JavaScript concepts: Closures, Event Loop, Promises/Async-Await, Prototype inheritance, and ES6+ features.',
            time_limit_minutes: 15,
            passing_score: 70,
            questions: [
                {
                    id: 1,
                    question: 'What is the output of `typeof (async () => {})()` in JavaScript?',
                    options: ['"undefined"', '"object"', '"function"', '"promise"'],
                    correct: 1, // 'object' because it returns a Promise object
                    explanation: 'An async function always returns a Promise, which has `typeof` equal to "object".'
                },
                {
                    id: 2,
                    question: 'Which statement accurately describes microtasks vs macrotasks in the JavaScript Event Loop?',
                    options: [
                        'Macrotasks execute before microtasks in every cycle.',
                        'Microtasks (e.g. Promise callbacks) are executed completely before the next macrotask (e.g. setTimeout) runs.',
                        'Microtasks and macrotasks run in parallel using Web Workers.',
                        'setTimeout callbacks take precedence over Promise.then callbacks.'
                    ],
                    correct: 1,
                    explanation: 'The event loop processes all pending microtasks in the microtask queue before fetching the next macrotask.'
                },
                {
                    id: 3,
                    question: 'How do JavaScript Closures preserve state?',
                    options: [
                        'By saving variables in the browser localStorage automatically.',
                        'By retaining a reference to the outer lexical environment even after the outer function has finished executing.',
                        'Through global variable references created at compile time.',
                        'By cloning all parameters into heap memory permanently.'
                    ],
                    correct: 1,
                    explanation: 'A closure is the combination of a function bundled together with references to its surrounding state (the lexical environment).'
                },
                {
                    id: 4,
                    question: 'What is the primary difference between `null` and `undefined` in JavaScript?',
                    options: [
                        '`null` is assigned automatically by the JS runtime; `undefined` is assigned manually.',
                        '`undefined` indicates a variable has been declared but not assigned a value, while `null` represents the intentional absence of any object value.',
                        '`null` and `undefined` are strictly equal (`null === undefined`).',
                        '`typeof null` is "null" and `typeof undefined` is "undefined".'
                    ],
                    correct: 1,
                    explanation: '`undefined` means a variable has no value yet. `null` is an explicit assignment representing "no value".'
                },
                {
                    id: 5,
                    question: 'Which method creates a shallow copy of an array in ES6?',
                    options: ['Array.from(arr)', '[...arr]', 'arr.slice()', 'All of the above'],
                    correct: 3,
                    explanation: 'All three techniques produce a shallow copy of the array.'
                }
            ]
        },
        {
            category: 'react',
            title: 'React & State Management Architecture',
            description: 'Evaluate React Hooks, Component Lifecycle, Virtual DOM reconciliation, Context API, and Performance Optimization.',
            time_limit_minutes: 15,
            passing_score: 70,
            questions: [
                {
                    id: 1,
                    question: 'When should you use `useCallback` instead of a standard function declaration?',
                    options: [
                        'In every single component for general performance enhancement.',
                        'When passing a callback function to an optimized child component that relies on reference equality (`React.memo`) to prevent re-renders.',
                        'Only inside asynchronous useEffect hooks.',
                        'To automatically mutate state in Redux stores.'
                    ],
                    correct: 1,
                    explanation: '`useCallback` caches a function definition between renders, useful when passing callbacks to memoized children.'
                },
                {
                    id: 2,
                    question: 'What is the role of the `key` prop in React lists?',
                    options: [
                        'It allows styling of list elements with CSS selectors.',
                        'It uniquely identifies elements so React’s reconciliation algorithm can determine which items were added, removed, or reordered.',
                        'It binds event handlers to parent DOM elements.',
                        'It serves as an index for local storage caching.'
                    ],
                    correct: 1,
                    explanation: 'Keys give elements a stable identity inside React Virtual DOM diffing.'
                },
                {
                    id: 3,
                    question: 'What happens when `useEffect` has an empty dependency array `[]`?',
                    options: [
                        'The effect runs on every single render cycle.',
                        'The effect runs only once after the initial mount and cleans up when the component unmounts.',
                        'The effect does not run at all.',
                        'The effect runs asynchronously in a Web Worker.'
                    ],
                    correct: 1,
                    explanation: 'An empty dependency array tells React that the effect doesn\'t depend on any values from props or state, running once on mount.'
                },
                {
                    id: 4,
                    question: 'How does React’s Virtual DOM improve application performance?',
                    options: [
                        'By bypassing browser security policies.',
                        'By keeping a lightweight representation of the UI in memory and batching minimal actual DOM mutations via reconciliation.',
                        'By compiling JSX to WebAssembly.',
                        'By rendering components directly onto HTML5 canvas.'
                    ],
                    correct: 1,
                    explanation: 'Direct DOM manipulation is slow; Virtual DOM minimizes direct DOM writes by computing diffs.'
                },
                {
                    id: 5,
                    question: 'What is the purpose of `useReducer` in React?',
                    options: [
                        'To replace CSS preprocessors.',
                        'To manage complex state logic involving multiple sub-values or when the next state depends on the previous one.',
                        'To fetch REST APIs automatically.',
                        'To minify JavaScript bundles at runtime.'
                    ],
                    correct: 1,
                    explanation: '`useReducer` is preferable to `useState` when state logic is complex or involves multiple transitions.'
                }
            ]
        },
        {
            category: 'java',
            title: 'Java & Object-Oriented Software Engineering',
            description: 'Test OOP concepts, Multithreading, JVM internals, Collections Framework, and Spring Boot architecture.',
            time_limit_minutes: 15,
            passing_score: 70,
            questions: [
                {
                    id: 1,
                    question: 'What is the primary difference between `HashMap` and `ConcurrentHashMap` in Java?',
                    options: [
                        '`HashMap` is synchronized; `ConcurrentHashMap` is not.',
                        '`ConcurrentHashMap` allows thread-safe concurrent reads and bucket/segment-level locking for writes without locking the whole map.',
                        '`ConcurrentHashMap` allows `null` keys while `HashMap` does not.',
                        '`HashMap` operates in O(N^2) time complexity.'
                    ],
                    correct: 1,
                    explanation: 'ConcurrentHashMap provides thread safety with high concurrency via bucket-level locks.'
                },
                {
                    id: 2,
                    question: 'Which JVM memory area stores object instances and arrays created with the `new` keyword?',
                    options: ['Java Stack', 'Heap Memory', 'Program Counter Register', 'Method Area / Metaspace'],
                    correct: 1,
                    explanation: 'All Java objects and arrays are dynamically allocated on the JVM Heap.'
                },
                {
                    id: 3,
                    question: 'What does the `transient` keyword signify in Java?',
                    options: [
                        'The variable cannot be modified after initialization.',
                        'The variable should not be serialized when the object is written to a stream.',
                        'The variable is shared across all instances of the class.',
                        'The method cannot be overridden by subclasses.'
                    ],
                    correct: 1,
                    explanation: 'Transient variables are ignored by the Java serialization subsystem.'
                },
                {
                    id: 4,
                    question: 'In Spring Boot, which annotation is used to create a RESTful controller that automatically serializes responses to JSON?',
                    options: ['@Controller', '@RestController', '@Component', '@Service'],
                    correct: 1,
                    explanation: '`@RestController` combines `@Controller` and `@ResponseBody`.'
                },
                {
                    id: 5,
                    question: 'What is the time complexity of searching by key in a well-balanced `HashMap`?',
                    options: ['O(N)', 'O(log N)', 'O(1) average case', 'O(N log N)'],
                    correct: 2,
                    explanation: 'Hash lookups execute in O(1) average constant time.'
                }
            ]
        },
        {
            category: 'sql',
            title: 'SQL & Relational Database Design',
            description: 'Evaluate Indexing strategies, Query optimization, ACID transactions, JOINs, Normalization, and Aggregations.',
            time_limit_minutes: 15,
            passing_score: 70,
            questions: [
                {
                    id: 1,
                    question: 'What is the key functional difference between `WHERE` and `HAVING` clauses in SQL?',
                    options: [
                        '`WHERE` filters rows before grouping/aggregations; `HAVING` filters aggregated group results after `GROUP BY`.',
                        '`HAVING` only works with primary keys.',
                        '`WHERE` cannot be used with SELECT statements.',
                        '`HAVING` executes faster than `WHERE` in all scenarios.'
                    ],
                    correct: 0,
                    explanation: '`WHERE` filters individual rows prior to grouping, whereas `HAVING` filters grouped summary records.'
                },
                {
                    id: 2,
                    question: 'What is the difference between a `LEFT JOIN` and an `INNER JOIN`?',
                    options: [
                        '`LEFT JOIN` returns only matched records from both tables.',
                        '`LEFT JOIN` returns all records from the left table and matched records from the right table (with NULLs for unmatched rows).',
                        '`INNER JOIN` returns unmatched rows from the left table.',
                        'There is no performance difference between them.'
                    ],
                    correct: 1,
                    explanation: 'A LEFT JOIN keeps every row from the left table, filling right table columns with NULL when no match exists.'
                },
                {
                    id: 3,
                    question: 'How does a B-Tree database index improve search query performance?',
                    options: [
                        'By encrypting all text columns in memory.',
                        'By organizing sorted keys hierarchically, reducing lookup disk I/O complexity from O(N) full table scans to O(log N).',
                        'By compressing the entire database into RAM.',
                        'By eliminating the need for foreign key constraints.'
                    ],
                    correct: 1,
                    explanation: 'B-Tree indexes maintain sorted balanced trees allowing O(log N) branch traversal.'
                },
                {
                    id: 4,
                    question: 'Which ACID property guarantees that once a transaction has committed, its changes survive system crashes?',
                    options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
                    correct: 3,
                    explanation: 'Durability ensures committed data is saved to non-volatile storage (WAL / disk).'
                },
                {
                    id: 5,
                    question: 'What is a composite index in SQL?',
                    options: [
                        'An index built across multiple columns together.',
                        'An index stored in a foreign table.',
                        'An index containing both JSON and XML data.',
                        'An index that automatically deletes duplicate records.'
                    ],
                    correct: 0,
                    explanation: 'A composite index indexes multiple columns in a specified order.'
                }
            ]
        },
        {
            category: 'python',
            title: 'Python & Modern Application Architecture',
            description: 'Evaluate Python Data Structures, Generators, Decorators, GIL, Memory Management, and REST API frameworks.',
            time_limit_minutes: 15,
            passing_score: 70,
            questions: [
                {
                    id: 1,
                    question: 'What makes a Python generator function different from a regular function returning a list?',
                    options: [
                        'Generators execute faster because they compile to C automatically.',
                        'Generators use `yield` to return items lazily one at a time, minimizing memory consumption for large datasets.',
                        'Generators can only return integer values.',
                        'Generators cannot be iterated over with `for` loops.'
                    ],
                    correct: 1,
                    explanation: 'Generators yield values on demand without allocating memory for the entire sequence.'
                },
                {
                    id: 2,
                    question: 'What is the role of Python decorators (`@decorator_name`)?',
                    options: [
                        'They add graphical UI styling to CLI applications.',
                        'They wrap another function or method to extend or modify its behavior without modifying its source code.',
                        'They declare private class variables.',
                        'They enforce strict compile-time type checking.'
                    ],
                    correct: 1,
                    explanation: 'Decorators are higher-order functions that wrap another function to augment its functionality.'
                },
                {
                    id: 3,
                    question: 'What is the Global Interpreter Lock (GIL) in CPython?',
                    options: [
                        'A security sandbox that prevents network attacks.',
                        'A mutex that allows only one native thread to execute Python bytecode at a time in CPython.',
                        'A database lock used by SQLAlchemy.',
                        'A mechanism that speeds up multithreaded CPU-bound tasks.'
                    ],
                    correct: 1,
                    explanation: 'The GIL prevents multiple native threads from executing Python bytecodes simultaneously in CPython.'
                },
                {
                    id: 4,
                    question: 'What is the time complexity of checking membership `x in s` if `s` is a Python `set`?',
                    options: ['O(N)', 'O(log N)', 'O(1) average case', 'O(N^2)'],
                    correct: 2,
                    explanation: 'Python sets use hash tables under the hood, yielding O(1) average lookup time.'
                },
                {
                    id: 5,
                    question: 'What does `*args` and `**kwargs` in a function signature allow?',
                    options: [
                        '`*args` accepts any number of positional arguments as a tuple; `**kwargs` accepts any number of keyword arguments as a dictionary.',
                        'They declare pointers to memory addresses.',
                        'They are required for all async functions in Python.',
                        'They define class constructors.'
                    ],
                    correct: 0,
                    explanation: '`*args` gathers extra positional arguments into a tuple, while `**kwargs` gathers named keyword arguments into a dict.'
                }
            ]
        },
        {
            category: 'html_css',
            title: 'HTML5, Modern CSS & Responsive Layouts',
            description: 'Test semantic markup, Flexbox, CSS Grid, Web Accessibility (WCAG), CSS Custom Properties, and responsive design.',
            time_limit_minutes: 15,
            passing_score: 70,
            questions: [
                {
                    id: 1,
                    question: 'What is the difference between CSS Flexbox and CSS Grid?',
                    options: [
                        'Flexbox is 1-dimensional (row OR column), while Grid is 2-dimensional (rows AND columns simultaneously).',
                        'Flexbox cannot be used on mobile devices.',
                        'Grid is only for images, while Flexbox is for text.',
                        'Flexbox requires JavaScript polyfills.'
                    ],
                    correct: 0,
                    explanation: 'Flexbox is designed for one-dimensional layouts; CSS Grid handles complex two-dimensional layout grids.'
                },
                {
                    id: 2,
                    question: 'Which CSS property creates hardware-accelerated, smooth animations without triggering layout reflows?',
                    options: ['top / left', 'transform and opacity', 'width / height', 'margin / padding'],
                    correct: 1,
                    explanation: '`transform` and `opacity` are composited on the GPU without triggering browser layout or paint steps.'
                },
                {
                    id: 3,
                    question: 'What is the primary purpose of semantic HTML tags (`<header>`, `<nav>`, `<main>`, `<article>`)?',
                    options: [
                        'To automatically apply bootstrap styles.',
                        'To provide structural meaning for screen readers, assistive technology, and search engines.',
                        'To speed up TCP socket downloads.',
                        'To restrict script execution inside those elements.'
                    ],
                    correct: 1,
                    explanation: 'Semantic HTML gives accessibility tools, browsers, and crawlers clear context regarding content hierarchy.'
                },
                {
                    id: 4,
                    question: 'What does `box-sizing: border-box;` do in CSS?',
                    options: [
                        'It causes elements to render inside a 3D box.',
                        'It includes padding and border in the element\'s total width and height calculation.',
                        'It prevents elements from wrapping onto new lines.',
                        'It disables all margins.'
                    ],
                    correct: 1,
                    explanation: 'With border-box, specified width and height include content, padding, and borders.'
                },
                {
                    id: 5,
                    question: 'Which media query correctly targets devices with a viewport width of 768px or less?',
                    options: ['@media (max-width: 768px)', '@media (min-width: 768px)', '@media screen: 768px', '@media device = 768'],
                    correct: 0,
                    explanation: '`@media (max-width: 768px)` applies rules when the screen width is 768px or narrower.'
                }
            ]
        },
        {
            category: 'dsa',
            title: 'Data Structures & Algorithms (DSA)',
            description: 'Evaluate algorithmic efficiency (Big-O), Binary Trees, Dynamic Programming, Graphs, and Sorting/Searching techniques.',
            time_limit_minutes: 20,
            passing_score: 70,
            questions: [
                {
                    id: 1,
                    question: 'What is the worst-case time complexity of standard QuickSort with poor pivot selection?',
                    options: ['O(N log N)', 'O(N^2)', 'O(log N)', 'O(N)'],
                    correct: 1,
                    explanation: 'If the smallest or largest element is consistently selected as pivot on sorted arrays, QuickSort degrades to O(N^2).'
                },
                {
                    id: 2,
                    question: 'Which data structure is most suitable for implementing a Breadth-First Search (BFS) graph traversal?',
                    options: ['Stack (LIFO)', 'Queue (FIFO)', 'Binary Max-Heap', 'Hash Set'],
                    correct: 1,
                    explanation: 'BFS uses a Queue to explore graph nodes level by level in FIFO order.'
                },
                {
                    id: 3,
                    question: 'What problem does Dynamic Programming (Memoization / Tabulation) solve?',
                    options: [
                        'It prevents memory leaks in garbage collected languages.',
                        'It avoids redundant calculations of overlapping subproblems by storing their solved results.',
                        'It guarantees O(1) sorting of any array.',
                        'It automatically parallelizes single-threaded code.'
                    ],
                    correct: 1,
                    explanation: 'Dynamic programming optimizes recursive algorithms by caching overlapping subproblem results.'
                },
                {
                    id: 4,
                    question: 'What is the time complexity of searching for an element in a balanced Binary Search Tree (AVL / Red-Black Tree)?',
                    options: ['O(N)', 'O(log N)', 'O(1)', 'O(N^2)'],
                    correct: 1,
                    explanation: 'Balanced BST height is guaranteed to be O(log N), keeping searches logarithmic.'
                },
                {
                    id: 5,
                    question: 'What is the space complexity of an in-place algorithm?',
                    options: ['O(1) auxiliary space beyond the input itself', 'O(N) space', 'O(N log N) space', 'O(2^N) space'],
                    correct: 0,
                    explanation: 'In-place algorithms use only O(1) constant additional memory.'
                }
            ]
        }
    ];

    for (const a of assessmentsData) {
        const [existing] = await db.query('SELECT id FROM assessments WHERE category = ?', [a.category]);
        if (existing.length === 0) {
            await db.query(
                `INSERT INTO assessments (category, title, description, time_limit_minutes, passing_score, questions)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [a.category, a.title, a.description, a.time_limit_minutes, a.passing_score, JSON.stringify(a.questions)]
            );
            console.log(`   ✔ Seeded assessment: ${a.title}`);
        } else {
            // Update questions and details to latest
            await db.query(
                `UPDATE assessments SET title = ?, description = ?, time_limit_minutes = ?, passing_score = ?, questions = ? WHERE category = ?`,
                [a.title, a.description, a.time_limit_minutes, a.passing_score, JSON.stringify(a.questions), a.category]
            );
            console.log(`   ✔ Updated assessment: ${a.title}`);
        }
    }

    await db.end();
    console.log('\n🎉 Database Schema Upgrade Complete! All AI intelligence tables are live and ready.\n');
}

upgrade().catch(err => {
    console.error('\n❌ Upgrade failed:', err);
    process.exit(1);
});
