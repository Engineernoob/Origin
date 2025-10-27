# Origin - Simple YouTube Setup

This is the simplified setup for getting Origin running quickly with just the core YouTube functionality.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (or use Docker)
- FFmpeg (for video processing)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd origin-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your database settings:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASS=your-password
   DB_NAME=origin
   ```

4. **Start PostgreSQL** (if using Docker)
   ```bash
   docker run --name origin-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=origin -p 5432:5432 -d postgres
   ```

5. **Start the backend**
   ```bash
   npm run start:dev
   ```

6. **Seed sample data** (optional)
   ```bash
   npm run seed
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd origin-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the frontend**
   ```bash
   npm run dev
   ```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Features

### Core Features
- ✅ Video upload with metadata
- ✅ Video listing/grid view
- ✅ Video playback page
- ✅ Search functionality
- ✅ Category filtering (trending, rebel content, etc.)
- ✅ User authentication (JWT)
- ✅ Basic video metadata storage

### How to Use

1. **Browse Videos**: Visit the homepage to see all videos
2. **Watch Videos**: Click on any video to view it
3. **Search**: Use the search bar to find videos
4. **Rebel Content**: Videos marked as 'Rebel' have a special badge
5. **Upload**: Navigate to `/upload` to upload new videos (requires auth)

## Simplified Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   File Storage  │
                       │   (Local FS)    │
                       └─────────────────┘
```

## Database Schema

### Videos Table
- `id` - Primary key
- `title` - Video title
- `description` - Video description
- `creatorName` - Channel name
- `videoUrl` - Path to video file
- `thumbnailUrl` - Path to thumbnail image
- `views` - View count
- `isRebelContent` - Boolean flag for rebel content
- `tags` - Array of tags
- `uploadedAt` - Upload timestamp

## Next Steps

To expand beyond the simple YouTube:
1. Add user profiles and channels
2. Implement comments system
3. Add video recommendations
4. Implement video processing/transcoding
5. Add real-time features with WebSockets
6. Set up caching with Redis
7. Add analytics and monitoring

## Troubleshooting

### Backend won't start
- Check PostgreSQL connection
- Verify environment variables
- Ensure all dependencies are installed

### Frontend can't connect to backend
- Check if backend is running on port 3001
- Verify CORS settings in backend
- Check API_URL environment variable

### Videos not playing
- Ensure video files exist in uploads directory
- Check file permissions
- Verify video format is supported by browser

### Authentication issues
- Check JWT secret in environment variables
- Verify Google OAuth settings (if using Google login)
