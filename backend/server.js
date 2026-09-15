require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 5000;

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

app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
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

// ─── Request logging (non-verbose) ───────────────────────────────────────────
if (process.env.APP_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
        next();
    });
}

// ─── Static: uploaded files ───────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'storage')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/jobs',         require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/profile',      require('./routes/profile'));
app.use('/api/saved-jobs',   require('./routes/savedJobs'));
app.use('/api/dashboard',    require('./routes/dashboard'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status:    'ok',
        message:   'Job Portal API is running',
        timestamp: new Date().toISOString(),
        env:       process.env.APP_ENV || 'development',
    });
});

// ─── 404 for unknown API routes ───────────────────────────────────────────────
app.use('/api/*', (req, res) => {
    res.status(404).json({ status: 'error', message: `Endpoint not found: ${req.originalUrl}` });
});

// ─── Serve frontend static files ──────────────────────────────────────────────
const frontendPath = path.join(__dirname, '..', 'frountend');
app.use(express.static(frontendPath));

// HTML page routes — direct access without .html extension works too
app.get('*', (req, res) => {
    // If the path has a dot (e.g. .ico, .png), let the 404 fall through
    if (req.path.includes('.')) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    if (err.message === 'CORS not allowed') {
        return res.status(403).json({ status: 'error', message: 'CORS policy violation' });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║     Job Portal API  — Running ✅      ║');
    console.log('╚══════════════════════════════════════╝\n');
    console.log(`  🌐 Frontend  →  http://localhost:${PORT}`);
    console.log(`  🔌 API Base  →  http://localhost:${PORT}/api`);
    console.log(`  ❤️  Health   →  http://localhost:${PORT}/api/health\n`);
    console.log('  Press Ctrl+C to stop\n');
});
