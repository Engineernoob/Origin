# Origin - Production Deployment Guide

## 🌐 Production Setup for originvideo.duckdns.org

### Server Information
- **Domain**: originvideo.duckdns.org
- **IP**: 162.195.168.34
- **Platform**: Ubuntu/Debian Linux

---

## 🔧 Environment Configuration

### 1. Backend Environment Setup
```bash
# On your server (162.195.168.34)
cd /path/to/origin-backend

# Copy production environment file
cp .env.production .env

# Edit the .env file with your actual values
nano .env
```

**Required .env Variables:**
```env
# Database (create a production database)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_secure_password
DB_NAME=origin_production

# Your domain
FRONTEND_URL=https://originvideo.duckdns.org

# YouTube API (if using)
YOUTUBE_API_KEY=your_api_key_here

# Security
JWT_SECRET=your_super_secure_random_string
```

### 2. Frontend Environment Setup
```bash
cd /path/to/origin-frontend

# Copy production environment
cp .env.production .env.local

# Edit with your backend IP
nano .env.local
```

**Required .env.local Variables:**
```env
# Your backend server IP
NEXT_PUBLIC_API_BASE=http://162.195.168.34:3000

# OR if you set up SSL on backend:
# NEXT_PUBLIC_API_BASE=https://162.195.168.34:3000
```

---

## 🚀 Deployment Steps

### Option A: Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Deploy Backend
cd origin-backend
npm run build
pm2 start ecosystem.config.js --env production

# Deploy Frontend  
cd ../origin-frontend
npm run build
pm2 start ecosystem.config.js --env production
```

### Option B: Using Docker
```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.prod.yml up --build -d
```

### Option C: Simple Node.js (For Testing)
```bash
# Backend
cd origin-backend
npm run build
npm run start:prod

# Frontend (in separate terminal)
cd origin-frontend
npm run build
npm run start
```

---

## 📡 Firewall & Port Setup

### Open Required Ports:
```bash
# Allow HTTP (80) for web server
sudo ufw allow 80

# Allow HTTPS (443) if using SSL
sudo ufw allow 443

# Allow backend (3000) for API (optional, can be internal)
sudo ufw allow 3000

# Allow frontend (3000) (optional, if not using reverse proxy)
sudo ufw allow 3000
```

---

## 🌐 Nginx Configuration

### Update Nginx for Your Domain:
```bash
sudo nano /etc/nginx/sites-available/origin
```

**Important changes in nginx.conf:**
- `server_name originvideo.duckdns.org;`
- Point to your server directories
- Upload the config to `/etc/nginx/sites-available/`

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/origin /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔐 SSL/HTTPS Setup

### Let's Encrypt (Free SSL):
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d originvideo.duckdns.org

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🎯 Testing Your Production Setup

### 1. Test API Connection:
```bash
# Test backend health
curl http://162.195.168.34:3000/health

# Test API from frontend domain
curl -H "Origin: https://originvideo.duckdns.org" \
     http://162.195.168.34:3000/api/videos
```

### 2. Test Frontend:
```bash
# Build and access your domain
https://originvideo.duckdns.org
```

### 3. Upload Test:
```bash
# Test video upload
curl -X POST \
  http://162.195.168.34:3000/api/videos/upload \
  -H "Content-Type: multipart/form-data" \
  -H "Origin: https://originvideo.duckdns.org" \
  -F "video=@test-video.mp4" \
  -F "title=Test Video"
```

---

## 📊 Monitoring & Logs

### PM2 Monitoring:
```bash
pm2 list
pm2 logs origin-backend
pm2 logs origin-frontend
pm2 monit
```

### Nginx Logs:
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔥 Production Performance Settings

### Backend Optimizations:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable PM2 cluster mode
pm2 start ecosystem.config.js -i max
```

### Database Optimizations:
```sql
-- PostgreSQL optimizations for video platform
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
SELECT pg_reload_conf();
```

---

## 🚨 Troubleshooting

### Common Issues:
1. **CORS Errors**: Check FRONTEND_URL in backend .env
2. **API Not Responding**: Check backend logs and port 3000
3. **Uploads Failing**: Check file permissions on uploads directory
4. **Videos Not Playing**: Check video URL format in database

### Database Issues:
```bash
# Reset database if needed
npm run migration:revert
npm run migration:run
npm run seed:youtube # or other seed command
```

---

## 📱 Next Steps

1. **Set up SSL** with Let's Encrypt
2. **Configure monitoring** with PM2 monitoring
3. **Set up backups** for database and uploads
4. **Monitor API usage** and set up rate limiting
5. **Consider CDN** for video serving at scale

---

## 🎉 Your Live URL

Once deployed, your platform will be available at:
**https://originvideo.duckdns.org**

### What Users See:
- 🎥 **Video Platform** - YouTube alternative
- 🔥 **Rebel Content** - Free speech zone  
- 🤖 **AI Recommendations** - Smart suggestions
- 📱 **Mobile Ready** - Responsive design
- 🔒 **Secure Uploads** - JWT authentication

---

**Production Checklist:**
- [ ] Environment variables configured
- [ ] Database created and seeded
- [ ] SSL certificate installed
- [ ] Nginx configured for domain
- [ ] CORS settings correct
- [ ] Upload directory permissions
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] API tested end-to-end
