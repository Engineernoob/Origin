# Backend Deployment Guide

## 🎯 **Overview**
Deploy your Origin backend with YouTube API integration and ML recommendation system to `https://originvideo.duckdns.org`.

## 🔧 **Deployment Options**

### **Option 1: Direct Docker Deployment** (Recommended)
Deploy directly to your server at `162.195.168.34`.

### **Option 2: Fly.io Deployment**
Use the existing Fly.io configuration.

### **Option 3: Docker Compose**
Local development and testing.

---

## 🚀 **Option 1: Direct Deployment to Your Server**

### **Step 1: Transfer Files**
```bash
# From your local machine
scp -r /Volumes/My\ Passport\ for\ Mac/Origin/origin-backend/* user@162.195.168.34:/home/user/origin-backend/

# Or use rsync for faster transfer
rsync -av --exclude='node_modules' --exclude='.git' /Volumes/My\ Passport\ for\ Mac/Origin/origin-backend/ user@162.195.168.34:/home/user/origin-backend/
```

### **Step 2: Configure Environment Variables**
On your server, create the environment file:
```bash
cd /home/user/origin-backend
nano .env
```

Add your configuration:
```bash
# YouTube API Configuration (REQUIRED FOR RECOMMENDATIONS)
YOUTUBE_API_KEY=your_youtube_api_key_here
YOUTUBE_QUOTA_LIMIT=9000
YOUTUBE_TRAINING_ENABLED=true

# Application Configuration
NODE_ENV=production
PORT=8080
```

### **Step 3: Build and Run Docker Image**
```bash
# Build the image
docker build -t origin-backend .

# Run with environment variables
docker run -d \
  --name origin-backend \
  --restart unless-stopped \
  -p 8080:8080 \
  --env-file /home/user/origin-backend/.env \
  origin-backend
```

### **Step 4: Setup Reverse Proxy (nginx)**
```nginx
server {
    listen 80;
    server_name originvideo.duckdns.org;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🌩 **Option 2: Fly.io Deployment**

### **Step 1: Install Fly.io CLI**
```bash
curl -L https://fly.io/install.sh | sh
```

### **Step 2: Login and Deploy**
```bash
fly auth login
cd /Volumes/My\ Passport\ for\ Mac/Origin/origin-backend
fly deploy
```

### **Step 3: Set Environment Variables**
```bash
fly secrets set YOUTUBE_API_KEY=your_youtube_api_key_here
```

---

## 🏠 **Option 3: Docker Compose (Local Development)**

### **docker-compose.yml**
```yaml
version: '3.8'
services:
  origin-backend:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
      - YOUTUBE_QUOTA_LIMIT=9000
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
```

### **Run Locally**
```bash
export YOUTUBE_API_KEY=your_key_here
docker-compose up -d
```

---

## ✅ **Verify Deployment**

### **Test API Endpoints**
```bash
# Check health status
curl https://originvideo.duckdns.org/health

# Test videos endpoint
curl https://originvideo.duckdns.org/api/videos

# Test YouTube API (with API key)
curl "https://originvideo.duckdns.org/api/youtube/search?q=blockchain"

# Check recommendations
curl "https://originvideo.duckdns.org/api/recommendations"
```

### **Expected Response**
Health endpoint should return:
```json
{
  "status": "ok",
  "timestamp": "2024-XX-XXTXX:XX:XX.XXXZ",
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

---

## 🔐 **Security Configuration**

### **YouTube API Key Protection**
- ✅ Never commit API keys to repository
- ✅ Use environment variables only
- ✅ Restrict API key by IP address
- ✅ Monitor API quota usage

### **Docker Security**
- ✅ Run as non-root user
- ✅ Use read-only file system where possible
- ✅ Limit container resources

### **Network Security**
- ✅ Use HTTPS (TLS/SSL)
- ✅ Configure firewall rules
- ✅ Rate limit API endpoints

---

## 📊 **Monitoring**

### **Check Logs**
```bash
# Docker logs
docker logs origin-backend -f

# Fly.io logs
fly logs origin-backend
```

### **Monitor YouTube API Usage**
```bash
curl https://originvideo.duckdns.org/api/youtube/quota
```

### **Health Checks**
```bash
# Set up monitoring with health endpoints
# Response time < 200ms
# API quota monitoring
# Error rate < 1%
```

---

## 🚨 **Troubleshooting**

### **YouTube API Issues**
```bash
# Check API key is set
curl https://originvideo.duckdns.org/api/youtube/quota

# Test API quota
curl -X POST https://originvideo.duckdns.org/api/youtube/train
```

### **Port Issues**
```bash
# Check if port 8080 is available
netstat -tulpn | grep 8080

# Check Docker container
docker ps | grep origin-backend
```

### **Docker Issues**
```bash
# Rebuild image
docker build --no-cache -t origin-backend .

# Remove old container
docker rm -f origin-backend
docker run -d --name origin-backend -p 8080:8080 origin-backend
```

---

## 🎯 **Production Checklist**

- [ ] YouTube API key configured
- [ ] DNS points to correct IP
- [ ] HTTPS/SSL certificate active
- [ ] Reverse proxy configured
- [ ] Monitoring setup
- [ ] Backup strategy
- [ ] Security hardening
- [ ] Load testing complete

---

## 🚀 **Deploy Command Summary**

### **Direct Deployment**
```bash
# Build and deploy
docker build -t origin-backend .
docker run -d --restart unless-stopped -p 8080:8080 -e YOUTUBE_API_KEY=$YOUTUBE_API_KEY origin-backend
```

### **Fly.io Deployment**
```bash
fly deploy
fly secrets set YOUTUBE_API_KEY=$YOUTUBE_API_KEY
```

Your backend with YouTube API integration is ready! 🎬🚀
