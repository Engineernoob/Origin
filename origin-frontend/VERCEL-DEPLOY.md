# Vercel Deployment Guide

## Prerequisites
- Vercel account
- Connected GitHub repository
- Backend deployed (Fly.io, DuckDNS, or other hosting)

## Environment Variables

Set these in your Vercel project settings:

### Required Variables
- `BACKEND_URL` - Your backend API URL (DuckDNS or Fly.io)
- `NEXT_PUBLIC_BACKEND_URL` - Same as BACKEND_URL (for client-side)
- `NEXT_PUBLIC_API_BASE` - Alternative API base URL

### Examples

#### DuckDNS Setup
```
BACKEND_URL=https://your-subdomain.duckdns.org
NEXT_PUBLIC_BACKEND_URL=https://your-subdomain.duckdns.org
NEXT_PUBLIC_API_BASE=https://your-subdomain.duckdns.org
```

#### Fly.io Setup
```
BACKEND_URL=https://your-app-name.fly.dev
NEXT_PUBLIC_BACKEND_URL=https://your-app-name.fly.dev
NEXT_PUBLIC_API_BASE=https://your-app-name.fly.dev
```

## Deployment Steps

1. **Connect Repository**
   - Go to Vercel dashboard
   - Add New Project
   - Import your GitHub repository
   - Select the `origin-frontend` directory

2. **Configure Build Settings**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Set Environment Variables**
   - Go to Settings → Environment Variables
   - Add the variables from above
   - Make sure to include both `NEXT_PUBLIC_` and regular versions

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Test the deployed application

## Post-Deployment

1. **Test API Connection**
   - Check that videos load from your backend
   - If not, fallback demo videos will be used

2. **Verify Auth**
   - Test authentication flow
   - OAuth callbacks should work properly

3. **Setup Custom Domain** (Optional)
   - Go to Domain Settings in Vercel
   - Add your custom domain
   - Update DNS records as instructed

## Troubleshooting

### API Connection Issues
- Verify BACKEND_URL is correct and accessible
- Check CORS settings on your backend
- Ensure backend is running and healthy

### Build Errors
- Check that all dependencies are installed
- Verify environment variables are set correctly
- Look at build logs in Vercel dashboard

### Authentication Problems
- Ensure OAuth redirect URIs include your Vercel domain
- Check that environment variables match your OAuth provider setup

## Backend URL Configuration

The frontend automatically tries multiple sources for the backend URL:
1. `NEXT_PUBLIC_API_BASE` environment variable
2. `NEXT_PUBLIC_BACKEND_URL` environment variable  
3. Falls back to the current domain (for API routes)
4. Uses demo videos if no backend is available

This ensures your app works even if the backend is temporarily unavailable.
