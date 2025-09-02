# YouTube-Like API Specification

## Authentication & Authorization

### OAuth 2.0 + JWT Implementation
```http
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

## Video Management

### Upload & Processing
```http
POST   /api/v1/videos                    # Upload video
GET    /api/v1/videos/upload-url         # Get signed upload URL
POST   /api/v1/videos/:id/thumbnail      # Upload custom thumbnail
PATCH  /api/v1/videos/:id               # Update video metadata
DELETE /api/v1/videos/:id               # Delete video
```

### Video Discovery
```http
GET /api/v1/videos                      # List videos (with filters)
GET /api/v1/videos/:id                  # Get video details
GET /api/v1/videos/trending             # Trending videos
GET /api/v1/videos/recommended          # Personalized recommendations
GET /api/v1/search/videos               # Search videos
GET /api/v1/videos/:id/related          # Related videos
```

### Video Streaming
```http
GET /api/v1/videos/:id/stream           # Video stream (with quality selection)
GET /api/v1/videos/:id/manifest.m3u8    # HLS manifest
GET /api/v1/videos/:id/dash.mpd         # DASH manifest
GET /api/v1/videos/:id/thumbnail        # Video thumbnail
```

## Channel Management

### Channel Operations
```http
GET    /api/v1/channels/:id             # Channel details
POST   /api/v1/channels                 # Create channel
PATCH  /api/v1/channels/:id            # Update channel
GET    /api/v1/channels/:id/videos      # Channel videos
GET    /api/v1/channels/:id/playlists   # Channel playlists
POST   /api/v1/channels/:id/subscribe   # Subscribe to channel
DELETE /api/v1/channels/:id/subscribe   # Unsubscribe
```

## User Interaction

### Engagement
```http
POST   /api/v1/videos/:id/like          # Like video
DELETE /api/v1/videos/:id/like          # Unlike video
POST   /api/v1/videos/:id/dislike       # Dislike video
POST   /api/v1/videos/:id/view          # Record view
POST   /api/v1/videos/:id/watch-time    # Record watch time
```

### Comments
```http
GET    /api/v1/videos/:id/comments      # Get comments
POST   /api/v1/videos/:id/comments      # Add comment
PATCH  /api/v1/comments/:id            # Edit comment
DELETE /api/v1/comments/:id            # Delete comment
POST   /api/v1/comments/:id/like       # Like comment
POST   /api/v1/comments/:id/reply      # Reply to comment
```

### Playlists
```http
GET    /api/v1/playlists               # User playlists
POST   /api/v1/playlists              # Create playlist
PATCH  /api/v1/playlists/:id          # Update playlist
DELETE /api/v1/playlists/:id          # Delete playlist
POST   /api/v1/playlists/:id/videos   # Add video to playlist
DELETE /api/v1/playlists/:id/videos/:videoId # Remove video
```

## Analytics & Monetization

### Analytics
```http
GET /api/v1/analytics/videos/:id       # Video analytics
GET /api/v1/analytics/channels/:id     # Channel analytics
GET /api/v1/analytics/revenue          # Revenue analytics
GET /api/v1/analytics/audience         # Audience insights
```

### Monetization
```http
GET  /api/v1/monetization/status       # Monetization eligibility
POST /api/v1/monetization/enable       # Enable monetization
GET  /api/v1/ads/config                # Ad configuration
POST /api/v1/ads/revenue               # Record ad revenue
```

## Real-time Features

### WebSocket Events
```
ws://api.domain.com/ws

Events:
- video:view_count_update
- comment:new
- notification:new
- live:chat_message
- live:viewer_count
```

### Live Streaming
```http
POST /api/v1/live/start                # Start live stream
POST /api/v1/live/stop                 # Stop live stream
GET  /api/v1/live/status               # Stream status
GET  /api/v1/live/chat                 # Live chat messages
POST /api/v1/live/chat                 # Send chat message
```

## Content Moderation

### Moderation
```http
POST /api/v1/moderation/report         # Report content
GET  /api/v1/moderation/queue          # Moderation queue (admin)
POST /api/v1/moderation/action         # Take moderation action
GET  /api/v1/content/violations        # Content violations
```

## Rate Limiting Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
```

## Error Responses
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is invalid",
    "details": {
      "field": "title",
      "issue": "Title cannot be empty"
    },
    "request_id": "req_123456789"
  }
}
```

## Pagination
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1000,
    "total_pages": 50,
    "next_page": 2,
    "prev_page": null
  }
}
```