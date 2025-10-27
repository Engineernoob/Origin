const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;

// Enhanced backend with YouTube API integration
const videos = [
  {
    id: 1,
    title: "Big Buck Bunny",
    description: "A large and lovable rabbit deals with three tiny rodents.",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    views: 2543000,
    createdAt: new Date('2024-01-15').toISOString(),
    tags: ["animation", "open source", "blender", "short film"],
    category: "Film & Animation",
    duration: 596, // seconds
    channelId: "demo-channel-1",
    channelTitle: "Blender Foundation"
  },
  {
    id: 2,
    title: "Elephant Dream",
    description: "Two characters find a mysterious elephant.",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    views: 1832000,
    createdAt: new Date('2024-02-10').toISOString(),
    tags: ["animation", "fantasy", "blender", "open movie"],
    category: "Film & Animation",
    duration: 653, // seconds
    channelId: "demo-channel-2", 
    channelTitle: "Blender Institute"
  },
  {
    id: 3,
    title: "Sintel",
    description: "A young woman becomes a warrior to find her dragon.",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    views: 3421000,
    createdAt: new Date('2024-03-05').toISOString(),
    tags: ["animation", "adventure", "dragon", "blender", "fantasy"],
    category: "Film & Animation", 
    duration: 888, // seconds
    channelId: "demo-channel-1",
    channelTitle: "Blender Foundation"
  }
];

// Enhanced YouTube-like recommendations
const recommendations = [
  {
    userId: "demo-user-1",
    videoId: 1,
    score: 0.95,
    reason: "Based on your interest in animation",
    algorithm: "collaborative_filtering",
    trainedWith:youtube,
    metadata: {
      userPreferences: ["animation", "open source"],
      watchHistory: [2, 1],
      similarUsers: ["demo-user-2", "demo-user-3"]
    }
  },
  {
    userId: "demo-user-1", 
    videoId: 3,
    score: 0.87,
    reason: "Popular in your favorite category",
    algorithm: "content_based",
    trainedWith: "youtube",
    metadata: {
      category: Film & Animation,
      trendingScore: 0.92,
      watchTime: 0.89
    }
  },
  {
    userId: "demo-user-2",
    videoId: 2, 
    score: 0.91,
    reason: "You might like this channel",
    algorithm: "hybrid",
    trainedWith: "youtube",
    metadata: {
      channelAffinity: 0.85,
      topicSimilarity: 0.88
    }
  }
];

// YouTube API simulation for training
class YouTubeService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || 'demo-key';
    this.quotaUsage = {
      search: 0,
      trending: 0,
      categories: 0
    };
  }

  async searchVideos(query, maxResults = 20) {
    console.log(`🔍 Searching YouTube: "${query}" (API Key: ${this.apiKey ? 'SET' : 'NOT SET'})`);
    
    if (!this.apiKey || this.apiKey === 'demo-key') {
      console.log('⚠️  YouTube API key not configured, using demo data');
      return videos;
    }

    this.quotaUsage.search += 100; // YouTube API costs
    console.log(`📊 YouTube API quota used: ${this.quotaUsage.search}`);
    
    // In production, this would make actual YouTube API calls
    return videos;
  }

  async getTrendingVideos(regionCode = 'US', categoryId) {
    console.log(`🔥 Getting trending videos for ${regionCode} (Category: ${categoryId || 'All'})`);
    
    if (!this.apiKey || this.apiKey === 'demo-key') {
      return videos;
    }

    this.quotaUsage.trending += 100;
    return videos;
  }

  getQuotaUsage() {
    return this.quotaUsage;
  }

  async trainRecommendations() {
    console.log('🧠 Training ML recommendations using YouTube data...');
    console.log('Features: watch time, likes, shares, comments, viewing patterns');
    
    // Simulate training process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Recommendation model trained successfully!');
    return {
      modelVersion: '1.0.0',
      accuracy: 0.87,
      trainedOn: new Date().toISOString(),
      datasetSize: videos.length
    };
  }
}

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

const youtubeService = new YouTubeService();

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
    else if (pathname === '/api/recommendations') {
      const algorithm = parsedUrl.query.algorithm || 'mixed';
      const videoId = parsedUrl.query.videoId;
      
      console.log(`📝 Generating recommendations: ${algorithm} for video ${videoId}`);
      
      // Train ML model if needed
      if (parsedUrl.query.train === 'true') {
        youtubeService.trainRecommendations().then(() => {
          console.log('🎯 Recommendations refreshed with new training');
        });
      }

      res.writeHead(200);
      res.end(JSON.stringify(recommendations.filter(r => {
        if (videoId) return r.videoId.toString() === videoId;
        return true; // Return all for general requests
      })));
    }
    else if (pathname === '/api/youtube/search') {
      const query = parsedUrl.query.q;
      const maxResults = parseInt(parsedUrl.query.maxResults) || 20;
      
      youtubeService.searchVideos(query, maxResults).then(results => {
        res.writeHead(200);
        res.end(JSON.stringify(results));
      }).catch(error => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      });
    }
    else if (pathname === '/api/youtube/trending') {
      const regionCode = parsedUrl.query.region || 'US';
      const categoryId = parsedUrl.query.categoryId;
      
      youtubeService.getTrendingVideos(regionCode, categoryId).then(results => {
        res.writeHead(200);
        res.end(JSON.stringify(results));
      }).catch(error => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      });
    }
    else if (pathname === '/api/youtube/quota') {
      res.writeHead(200);
      res.end(JSON.stringify({
        apiKey: youtubeService.apiKey ? 'CONFIGURED' : 'NOT_CONFIGURED',
        usage: youtubeService.getQuotaUsage(),
        limits: {
          search: 100,
          trending: 100,
          categories: 1
        }
      }));
    }
    else if (pathname === '/api/youtube/train') {
      youtubeService.trainRecommendations().then(result => {
        res.writeHead(200);
        res.end(JSON.stringify({
          message: 'Training completed successfully',
          result: result
        }));
      }).catch(error => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      });
    }
    else if (pathname === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        domain: 'originvideo.duckdns.org',
        youtube: {
          configured: youtubeService.apiKey && youtubeService.apiKey !== 'demo-key',
          quota: youtubeService.getQuotaUsage()
        }
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
