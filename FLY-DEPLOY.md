# 🚀 DEPLOY BACKEND ON FLY.IO

## 📋 Prerequisites

1. **Install Fly CLI:**
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Login to Fly:**
```bash
fly auth login
```

---

## 🔧 Step 1: Deploy Backend

### **Database Setup (PostgreSQL on Fly):**
```bash
# Create PostgreSQL database
flyctl postgres create

# Database configuration will be provided - save it!
# Looks like: DATABASE_URL=postgres://...
```

### **Deploy the Application:**
```bash
cd origin-backend

# Launch your app
flyctl launch

# Answer prompts:
# ✅ Continue using existing config? No (since we have fly.toml)
# ✅ Choose app name: origin-backend (or press Enter)
# ✅ Choose region: sjc (or closest)
# ✅ Set up Postgres? Yes (or do separately)

# Deploy!
flyctl deploy
```

---

## 🔗 Step 2: Set Environment Variables

### **Add Required Environment Variables:**
```bash
# Set your app name from deployment:
FLY_APP=origin-backend

# Database URL (from postgres create)
flyctl secrets set DATABASE_URL="postgres://user:pass@host:5432/dbname"

# YouTube API (if using)
flyctl secrets set YOUTUBE_API_KEY="your_youtube_api_key"

# Frontend URL
flyctl secrets set FRONTEND_URL="https://origin-frontend-seven.vercel.app"

# JWT Secret (generate one)
flyctl secrets set JWT_SECRET="your_super_secret_random_string_1234567890"

# Other required secrets
flyctl secrets set NODE_ENV="production"
flyctl secrets set PORT="8080"
```

---

## 📦 Step 3: Upload Volume Setup

### **Create Volume for Video Uploads:**
```bash
# Create persistent volume
flyctl volumes create origin_uploads --size 10 --region sjc

# Attach to your app (if not already in fly.toml)
flyctl volume attach origin_uploads --app origin-backend
```

---

## 🔄 Step 4: Seed Database with Videos

### **Run YouTube API Seeding:**
```bash
# Connect to your app's console
flyctl ssh console

# Update packages
npm install

# Run YouTube seeding
npm run seed:youtube

# Or use local seed:
npm run seed

# Exit console
exit
```

---

## ✅ Step 5: Test Your Backend

### **Check Health Status:**
```bash
# Get your app URL
flyctl status -a origin-backend

# Test health endpoint
curl https://origin-backend.fly.dev/health
curl https://origin-backend.fly.dev/api/videos
```

**Your Backend URL will be:**
```
https://origin-backend.fly.dev
```

---

## 🔌 Step 6: Connect to Frontend

### **Update Vercel Environment:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click: `origin-frontend-seven` → Settings → Environment Variables
3. Add: `NEXT_PUBLIC_API_BASE` = `https://origin-backend.fly.dev`
4. Redeploy (automatic)

### **Or with Vercel CLI:**
```bash
cd origin-frontend
vercel env add NEXT_PUBLIC_API_BASE production
# Enter: https://origin-backend.fly.dev
```

---

## 🎯 Your Live URLs:

- **Frontend**: https://origin-frontend-seven.vercel.app
- **Backend**: https://origin-backend.fly.dev
- **Database**: PostgreSQL on Fly.io
- **File Storage**: Fly.io Volume (10GB)

---

## 🔥 Commands Reference:

### **🔄 Redeploy after changes:**
```bash
flyctl deploy
```

### **📋 View logs:**
```bash
flyctl logs -a origin-backend
```

### **⚡ Scale up (if needed):**
```bash
flyctl scale count 2 -a origin-backend
flyctl scale memory 2048 -a origin-backend
```

### **💰 Check usage/costs:**
```bash
flyctl spending -a origin-backend
```

---

## 💡 Fly.io Benefits:

✅ **Fast global deployment** (edge locations)  
✅ **Built-in PostgreSQL** (managed database)  
✅ **Persistent volumes** (for video uploads)  
✅ **Free tier** (about 160GB/month transfer)  
✅ **Great for APIs** (Node.js optimized)  
✅ **Simple CLI** (version control integrated)

---

## 🚨 Troubleshooting:

### **Database Connection Issues:**
```bash
# Check database status
flyctl postgres status -a origin-db

# Reset database if needed
flyctl postgres reset -a origin-db
```

### **Build Failures:**
```bash
# Check build logs
flyctl logs -a origin-backend --build

# Redeploy
flyctl deploy --strategy=immediate
```

### **Upload Issues:**
```bash
# Check volume status
flyctl volumes list -a origin-backend

# Check permissions on app
flyctl ssh console -a origin-backend
ls -la /app/uploads
```

---

## 🎉 Success!

When complete, you'll have:
- 🌐 Live frontend on Vercel
- 🔧 Live backend on Fly.io  
- 🗄️ PostgreSQL database
- 📦 Persistent uploads
- 🎥 Real YouTube videos!
- 🔥 Full YouTube alternative at originvideo.duckdns.org!

Ready to deploy! 🚀
