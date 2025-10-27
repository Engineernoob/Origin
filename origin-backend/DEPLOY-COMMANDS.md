# Backend Deployment Commands with YouTube API

## 🚀 **Option 1: Direct Deployment to Your Server (162.195.168.34)**

### **Step 1: Upload Files to Server**
```bash
# Copy backend files to your server
scp /Volumes/My\ Passport\ for\ Mac/Origin/origin-backend/* user@162.195.168.34:/home/user/origin-backend/

# Or use rsync (faster for large directories)
rsync -av --exclude='node_modules' --exclude='.git' /Volumes/My\ Passport\ for\ Mac/Origin/origin-backend/ user@162.195.168.34:/home/user/origin-backend/
```

### **Step 2: Build and Deploy with YouTube API**
```bash
# SSH into your server
ssh user@162.195.168.34

# Navigate to backend directory
cd /home/user/origin-backend

 # Install Docker if not already installed
 curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker
newgrp docker
logout
# Log back in
ssh user@162.195.168.34

# Build Docker image
docker build -t origin-backend .

# Run with environment file
docker run -d \
  --name origin-backend \
  --restart unless-stopped \
  -p 8080:8080 \
  --env-file /home/user/origin-backend/.env.production \
  origin-backend

# Check the status
docker logs origin-backend
```

### **Step 3: Set up HTTPS/SSL (nginx)**
```bash
# Install nginx if not installed
sudo apt update && sudo apt install -y nginx

# Create nginx config for your domain
sudo tee /etc/nginx/sites-available/originvideo << 'EOF'
server {
    listen 80;
    server_name originvideo.duckdns.org;
    return 301 https://$server_name$request_uri;

    server {
        listen 443 ssl;
        server_name originvideo.duckdns.org;
        ssl_certificate /etc/letsencrypt/live/originvideo.duckdns.org/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/originvideo.duckdns.org/privkey.pem;

        location / {
            proxy_pass http://localhost:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/originvideo /etc/nginx/sites-enabled/

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d originvideo.duckdns.org
```

---

## 🌩 **Option 2: Fly.io Deployment with YouTube API**

### **Step 1: Deploy Backend**
```bash
cd /Volumes/My\ Passport\ for\ Mac/Origin/origin-backend
fly deploy

# Set YouTube API key as secret
fly secrets set YOUTUBE_API_KEY=''

# Check deployment
fly status
fly logs
```

### **Step 2: Configure Environment**
```bash
# Open Fly.io config in editor
fly open

# Add to fly.toml:
[env]
YOUTUBE_API_KEY = ''

# Deploy again
fly deploy
```

---

## 🏠 **Option 3: Docker Compose (Local Testing)**

### **docker-compose.yml**
```yaml
version: '3.8'
services:
  origin-backend:
    build: .
    environment:
      - NODE_ENV=production
      - PORT=8080
      - YOUTUBE_API_KEY=''
      - FRONTEND_URL=https://originvideo.duckdns.org
    volumes:
      - ./uploads:/app/uploads
    ports:
      - "8080:8080"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - origin-backend
```

### **Run Locally**
```bash
# Set up environment
export YOUTUBE_API_KEY=''

# Run with Docker Compose
docker-compose up -d

# Or Docker directly
docker build -t origin-backend .
docker run -d --restart unless-stopped \
  -e "YOUTUBE_API_KEY=" \
  -p 8080:8080 origin-backend
```

---

## 🔧 **Post-Deployment Testing**

### **Test Backend Endpoints**
```bash
# Test health check
curl https://originvideo.duckdns.org/health

# Test video endpoint
curl https://originvideo.duckdns.org/api/videos

# Test YouTube API integration
curl "https://originvideo.duckdns.org/api/youtube/search?q=blockchain&maxResults=5"

# Test recommendations
curl "https://originvideo.duckdns.org/api/recommendations?algorithm=mixed"

# Test YouTube API quota
curl https://originvideo.duckdns.org/api/youtube/quota

# Train ML model
curl -X POST https://originvideo.duckdns.org/api/youtube/train
```

### **Expected Response Examples**

#### **Health Check**
```json
{
  "status": "ok",
  "timestamp": "2024-10-27T14:30:00.000Z",
  "domain": "originvideo.duckdns.org",
  "youtube": {
    "configured": true,
    "quota": {
      "search": 0,
      "trending": 0,
      "categories": 0
    }
  }
}
```

#### **YouTube API Status**
```json
{
  "apiKey": "CONFIGURED",
  "usage": {
    "search": 0,
    "trending": 0,
    "categories": 0
  },
  "limits": {
    "search": 100,
    "trending": 100,
    "categories": 1
  }
}
```

---

## 🎯 **YouTube API Features Enabled**

### **ML Recommendation System**
- ✅ **Collaborative Filtering**: User similarity patterns
- ✅ **Content-Based**: Video metadata analysis
- ✅ **Hybrid Algorithm**: Combined approach
- ✅ **Real-Time Training**: Continuous learning

### **YouTube Data Integration**
- ✅ **Video Search**: Find relevant content
- ✅ **Trending Videos**: Popular content by category
- ✅ **Categories**: 15+ video categories available
- ✅ **Quota Management**: Cost optimization

### **Smart Features**
- ✅ **Auto-Ret raining**: Models improve with new data
- ✅ **User Analytics**: Track viewing patterns
- ✅ **Trending Detection**: Popular content identification
- ✅ **Channel Affinity**: Learn from user preferences

## 🔐 **Security Checklists**

### **Before Deployment**
- [ ] YouTube API key properly secured
- [ ] Environment variables set
- [ ] HTTPS/SSL configured
- [ ] Firewall rules configured
- [ ] Rate limiting enabled

### **After Deployment**
- [ ] Check all endpoints work
- [ ] Monitor YouTube API quota
- [ ] Test recommendation accuracy
- [ ] Verify SSL certificates
- [ ] Monitoring dashboards active

---

## 🚀 **Quick Deploy Command (Direct to Server)**

```bash
# One-line deployment for your server
ssh user@162.195.168.16834 'cd /home/user/origin-backend && docker build -t origin-backend . && docker run -d --restart unless-stopped -p 8080:8080 --env-file /home/user/origin-backend/.env.production origin-backend && docker logs -f origin-backend'
```

---

## 🎬 **YouTube API Fun Facts**

With your API key (``), you can:

📊 **API Quota**: 10,000 units per day
🔍 **Search Videos**: 100 units per request  
🔥 **Trending Content**: 100 units per request
📚 **Video Categories**: 1 unit each
🧠 **ML Training**: Advanced recommendation models
🎯 **Real-Time Updates**: Continuous content discovery

Your YouTube integration is ready for production! 🚀✨
