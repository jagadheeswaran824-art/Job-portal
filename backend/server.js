const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Ensure local storage directories exist ────────────────────────────────────
const storageDir = path.join(__dirname, 'storage');
['avatars', 'resumes'].forEach(folder => {
    try {
        const dir = path.join(storageDir, folder);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (err) {
        // Read-only filesystem in serverless environments (e.g. Vercel)
    }
});

// ─── Security headers ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['*'];

// Always allow local dev ports and vercel previews
const devOrigins = ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:8080'];

app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || devOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            cb(null, true);
        } else {
            cb(new Error('CORS not allowed'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request logging (development) ────────────────────────────────────────────
if (process.env.APP_ENV !== 'production') {
    app.use((req, res, next) => {
        if (!req.originalUrl.startsWith('/uploads') && !req.originalUrl.includes('.')) {
            console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
        }
        next();
    });
}

// ─── Static: uploaded files ───────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'storage')));

// ─── Interactive API Documentation ────────────────────────────────────────────
app.get(['/api-docs', '/api/docs'], (req, res) => {
    res.sendFile(path.join(__dirname, 'docs', 'docs.html'));
});
app.get('/api/openapi.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'docs', 'openapi.json'));
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/users',           require('./routes/users'));
app.use('/api/profile',         require('./routes/profile'));
app.use('/api/jobs',            require('./routes/jobs'));
app.use('/api/search',          require('./routes/search'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/applications',    require('./routes/applications'));
app.use('/api/saved-jobs',      require('./routes/savedJobs'));
app.use('/api/notifications',   require('./routes/notifications'));
app.use('/api/admin',           require('./routes/admin'));
app.use('/api/analytics',       require('./routes/analytics'));
app.use('/api/ai',              require('./routes/ai'));
app.use('/api/career',          require('./routes/career'));
app.use('/api/assessments',     require('./routes/assessments'));
app.use('/api/interviews',      require('./routes/interviews'));
app.use('/api/portfolio',       require('./routes/portfolio'));
app.use('/api/security',        require('./routes/security'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        success:   true,
        status:    'ok',
        message:   'Job Portal API is running smoothly',
        timestamp: new Date().toISOString(),
        env:       process.env.APP_ENV || 'development',
        version:   '1.0.0',
    });
});

// ─── 404 for unknown API routes ───────────────────────────────────────────────
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        status:  'error',
        error:   { code: 'ENDPOINT_NOT_FOUND', message: `Endpoint not found: ${req.originalUrl}` }
    });
});

// ─── Serve frontend static files ──────────────────────────────────────────────
let frontendPath = path.join(__dirname, '..', 'frountend');
if (!fs.existsSync(frontendPath)) {
    frontendPath = path.join(__dirname, 'frountend');
}
if (!fs.existsSync(frontendPath)) {
    frontendPath = path.join(process.cwd(), 'frountend');
}
app.use(express.static(frontendPath));

// HTML page routing
app.get('*', (req, res) => {
    const cleanPath = req.path.replace(/^\//, '').replace(/\/$/, '');
    if (cleanPath) {
        const directHtml = path.join(frontendPath, `${cleanPath}.html`);
        if (fs.existsSync(directHtml)) {
            return res.sendFile(directHtml);
        }
    }
    if (req.path.includes('.')) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    if (err.message === 'CORS not allowed') {
        return res.status(403).json({ success: false, status: 'error', error: { code: 'CORS_VIOLATION', message: 'CORS policy violation' } });
    }
    console.error('Unhandled server error:', err);
    res.status(500).json({ success: false, status: 'error', error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
});

module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log('\n╔═══════════════════════════════════════════════╗');
        console.log('║     Job Portal Pro API — Running ✅           ║');
        console.log('╚═══════════════════════════════════════════════╝\n');
        console.log(`  🌐 Website   →  http://localhost:${PORT}`);
        console.log(`  🔌 API Base  →  http://localhost:${PORT}/api`);
        console.log(`  📚 API Docs  →  http://localhost:${PORT}/api-docs`);
        console.log(`  ❤️  Health   →  http://localhost:${PORT}/api/health\n`);
    });
}
