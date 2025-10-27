const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;

// Demo videos data
const videos = [
  {
    id: 1,
    title: "Big Buck Bunny",
    description: "A large and lovable rabbit deals with three tiny rodents.",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    views: 2543000,
    createdAt: new Date('2024-01-15').toISOString()
  },
  {
    id: 2,
    title: "Elephant Dream",
    description: "Two characters find a mysterious elephant.",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    views: 1832000,
    createdAt: new Date('2024-02-10').toISOString()
  },
  {
    id: 3,
    title: "Sintel",
    description: "A young woman becomes a warrior to find her dragon.",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    views: 3421000,
    createdAt: new Date('2024-03-05').toISOString()
  }
];

// MIME types for serving static files
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

// Serve static files from frontend build
function serveStaticFile(res, filePath) {
  // Strip leading slash for path joining
  filePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  
  const fullPath = path.join(__dirname, 'public', filePath);
  
  // Debug logging
  console.log(`Serving file: ${filePath} -> ${fullPath}`);
  console.log(`File exists: ${fs.existsSync(fullPath)}`);
  
  // Default to index.html for SPA routing
  if (filePath === '' || !fs.existsSync(fullPath)) {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    console.log(`Fallback to index.html: ${indexPath}`);
    console.log(`Index exists: ${fs.existsSync(indexPath)}`);
    
    if (fs.existsSync(indexPath)) {
      try {
        const content = fs.readFileSync(indexPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
        return true;
      } catch (err) {
        console.error('Error reading index.html:', err);
        return false;
      }
    }
    return false;
  }

  try {
    const content = fs.readFileSync(fullPath);
    const mimeType = getMimeType(fullPath);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
    return true;
  } catch (err) {
    console.error('Error serving static file:', err);
    return false;
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`Request: ${req.method} ${pathname}`);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    console.log('API route detected');
    res.setHeader('Content-Type', 'application/json');

    if (pathname === '/api/videos' || pathname === '/api/videos/') {
      res.writeHead(200);
      res.end(JSON.stringify(videos));
    } 
    else if (pathname === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        domain: 'originvideo.duckdns.org'
      }));
    }
    else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'API endpoint not found' }));
    }
    return;
  }

  // Serve frontend static files
  console.log('Frontend route detected, checking static files...');
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/api/') || 
      pathname.includes('.')) {
    console.log('Attempting to serve static file:', pathname);
    if (serveStaticFile(res, pathname)) {
      return;
    }
  }

  // Serve the main frontend app for all other routes (SPA routing)
  console.log('Attempting to serve index.html for SPA routing');
  const indexPath = path.join(__dirname, 'public', 'index.html');
  console.log('Index.html path:', indexPath);
  console.log('Index.html exists:', fs.existsSync(indexPath));
  
  if (fs.existsSync(indexPath)) {
    try {
      const content = fs.readFileSync(indexPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
      return;
    } catch (err) {
      console.error('Error reading index.html:', err);
    }
  }

  // Fallback to simple HTML if no frontend build exists
  console.log('Falling back to simple HTML');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Origin - Ad-Free Video Platform</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #0a0a0a; color: #fff; line-height: 1.6;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .container { 
                text-align: center; 
                max-width: 800px; 
                padding: 2rem; 
            }
            .header {
                margin-bottom: 3rem;
            }
            .title { 
                font-size: 3rem; 
                margin-bottom: 1rem; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .subtitle { 
                color: #999; 
                font-size: 1.2rem; 
                margin-bottom: 2rem; 
            }
            .video-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 2rem;
                margin-top: 2rem;
            }
            .video-card {
                background: #1a1a1a;
                border-radius: 12px;
                overflow: hidden;
                transition: transform 0.2s;
                cursor: pointer;
            }
            .video-card:hover { transform: translateY(-4px); }
            .video-thumbnail {
                width: 100%;
                height: 180px;
                object-fit: cover;
                background: #333;
            }
            .video-info {
                padding: 1rem;
            }
            .video-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
            .video-stats { 
                color: #999; 
                font-size: 0.9rem; 
                display: flex; 
                justify-content: space-between;
            }
            .status {
                background: #2a2a2a;
                padding: 1rem;
                border-radius: 8px;
                margin: 2rem 0;
                border-left: 4px solid #667eea;
            }
            .api-info {
                background: #1a1a1a;
                padding: 1rem;
                border-radius: 8px;
                margin-top: 2rem;
                font-family: monospace;
                font-size: 0.9rem;
                color: #0f0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="title">🎬 Origin</h1>
                <p class="subtitle">The Ad-Free Video Platform</p>
            </div>

            <div class="status">
                <h3>✅ Platform Status: Online</h3>
                <p>Backend API running on <strong>originvideo.duckdns.org</strong></p>
                <p>Frontend serving from same domain</p>
            </div>

            <div class="video-grid">
                ${videos.map(video => `
                    <div class="video-card" onclick="openVideo('${video.videoUrl}', '${video.title}')">
                        <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
                        <div class="video-info">
                            <div class="video-title">${video.title}</div>
                            <div class="video-stats">
                                <span>${(video.views / 1000000).toFixed(1)}M views</span>
                                <span>${new Date(video.createdAt).getFullYear()}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="api-info">
                <strong>API Endpoints:</strong><br>
                GET /api/videos - Video catalog<br>
                GET /health - Health check<br>
                All routes serve frontend (SPA routing)
            </div>
        </div>

        <script>
            function openVideo(videoUrl, title) {
                window.open(videoUrl, '_blank');
            }
            
            // Load videos from API
            fetch('/api/videos')
                .then(response => response.json())
                .then(data => console.log('Videos loaded:', data))
                .catch(err => console.log('API Error:', err));
        </script>
    </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`🚀 Origin Unified Server running on port ${PORT}`);
  console.log(`🌐 Serving at: https://originvideo.duckdns.org`);
  console.log(`📊 Health check: /health`);
  console.log(`📹 API Videos: /api/videos`);
  console.log(`🎨 Frontend: All other routes`);
});
