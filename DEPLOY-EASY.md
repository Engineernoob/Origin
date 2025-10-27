# 🚀 EASY DEPLOYMENT: Vercel + Railway Guide

## 📱 Step 1: Frontend on Vercel (FREE)

### Create Vercel Account & Deploy:
```bash
# 1. Go to https://vercel.com and signup (free with GitHub)
# 2. Install Vercel CLI
npm i -g vercel

# 3. From your frontend folder:
cd origin-frontend
vercel login
vercel --prod
```

### Vercel Deployment Steps:
1. **Link to GitHub**: Connect your repository
2. **Import Project**: Select `origin-frontend` folder  
3. **Environment Variables**: 
   - `NEXT_PUBLIC_API_BASE` = `https://your-backend-app.railway.app`
4. **Deploy**: Vercel builds and deploys automatically

### Your Frontend URL:
```
https://origin-frontend-xyz.vercel.app
```

---

## 🔧 Step 2: Backend on Railway (~$5-10/month)

### Create Railway Account:
```bash
# 1. Go to https://railway.app and signup
# 2. Connect your GitHub account
```

### Deploy Backend on Railway:
1. **New Project** → "Deploy from GitHub repo"
2. **Select your repository** (origin-backend)
3. **Add Environment Variables**:
   ```
   NODE_ENV=production
   YOUTUBE_API_KEY=your_youtube_api_key_here
   JWT_SECRET=your_random_secret_string
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```
4. **Add PostgreSQL database** (free tier)
5. **Deploy** → Railway builds and auto-deploys

### Your Backend URL:
```
https://origin-backend-xyz.up.railway.app
```

---

## 🔗 Step 3: Connect Everything

### Update Frontend API URL:
1. Go to Vercel dashboard → your project
2. Settings → Environment Variables  
3. Update: `NEXT_PUBLIC_API_BASE` = your Railway URL

### Update Backend CORS:
1. Go to Railway dashboard → your project
2. Variables → `FRONTEND_URL` = your Vercel URL

---

## 🌐 Step 4: Domain Setup (DuckDNS)

### Point DuckDNS to Vercel:
1. **Go to duckdns.org**
2. **Add your Vercel URL**: 
   ```
   https://origin-frontend-xyz.vercel.app
   ```
3. **Use DNS forwarding** (DuckDNS supports this)

### OR Point to Custom Domain:
1. **On Vercel**: Add custom domain `originvideo.duckdns.org`
2. **Get DNS records** from Vercel
3. **Update DuckDNS** with those records

---

## 🎬 Step 5: Test Everything

### API Test:
```bash
# Test your backend
curl https://your-railway-app.railway.app/health

# Test API with CORS
curl -H "Origin: https://your-vercel-app.vercel.app" \
     https://your-railway-app.railway.app/api/videos
```

### Frontend Test:
- Visit your Vercel URL
- Should show videos (run seed command first)

### Seed Your Database:
```bash
# On Railway dashboard:
# 1. Go to your project → Variables
# 2. Add console/command: npm run seed:youtube  
# 3. Or set up a one-time deployment script
```

---

## 💰 Costs Breakdown:

### **FREE Tier:**
- Vercel Frontend: $0 (includes 100GB bandwidth)
- Railway: $0 (500 hours/month, limited database)

### **Paid Tier (Recommended):**
- Vercel Pro: $20/month (optional)
- Railway Hobby: $5/month (unlimited projects + database)
- YouTube API: Free tier (10,000 requests/day)

**Total: ~$5/month for full platform!**

---

## 🔄 Auto-Deploy When You Push Code:

### GitHub Integration:
```bash
# Both Vercel and Railway auto-deploy when you push:

git add .
git commit -m "Update production"
git push origin main

# ✅ Auto-deploys to both services! 🎉
```

---

## ⚡ Quick Start Commands:

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy frontend
cd origin-frontend
vercel --prod

# 3. Deploy backend (via Railway dashboard)
# Go to railway.app → New Project →GitHub

# 4. Update environment variables
# Vercel: NEXT_PUBLIC_API_BASE = railway_url
# Railway: FRONTEND_URL = vercel_url

# 5. Test live!
```

---

## 🎯 Your Live Platform Will Be At:

- **Frontend**: https://originvideo.duckdns.org
- **Backend**: https://your-app.railway.app  
- **Database**: Provided by Railway
- **YouTube Seeding**: Ready to use!

---

## 🆘 Troubleshooting:

### CORS Issues:
```
Check FRONTEND_URL on Railway matches your Vercel URL exactly
```

### API Not Working:
```
Verify NEXT_PUBLIC_API_BASE on Vercel matches Railway URL
```

### Database Issues:
```
Railway automatically sets DATABASE_URL env variable
```

### Videos Not Showing:
```
Run: npm run seed:youtube (on Railway console)
```

---

## 📈 Next Steps:

1. **Set up monitoring** on Railway (logs/metrics)
2. **Add analytics** (Google Analytics on frontend)
3. **Scale up** if traffic grows (upgrade Railway plan)
4. **Add SSL** (both services include free HTTPS)

You're now ready to deploy! 🚀
