const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf'
};

const server = http.createServer((req, res) => {
    // Get the file path
    let filePath = '.' + req.url;
    
    // Default to index.html
    if (filePath === './') {
        filePath = './QUICK_START.html';
    }
    
    // Get file extension
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    // Read and serve the file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found - try with .html extension
                fs.readFile(filePath + '.html', (err, cont) => {
                    if (err) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(cont, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🚀 Job Portal AI Server is Running!');
    console.log('========================================\n');
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`🏠 Quick Start: http://localhost:${PORT}/QUICK_START.html`);
    console.log(`🏠 Homepage: http://localhost:${PORT}/index.html`);
    console.log(`🔐 Login: http://localhost:${PORT}/login.html`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`✨ Advanced Dashboard: http://localhost:${PORT}/advanced-dashboard.html`);
    console.log(`💼 Jobs: http://localhost:${PORT}/jobs.html`);
    console.log(`👤 Profile: http://localhost:${PORT}/profile.html`);
    console.log('\n========================================');
    console.log('Press Ctrl+C to stop the server');
    console.log('========================================\n');
});
