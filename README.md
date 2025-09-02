# Origin - Next Generation Video Platform

Origin is a modern, scalable video platform built to compete with YouTube. It features advanced video processing, real-time interactions, intelligent recommendations, and enterprise-grade monitoring.

## 🚀 Features

### Core Features
- **Video Upload & Processing**: Multi-quality transcoding with FFmpeg
- **Adaptive Streaming**: HLS/DASH support for optimal viewing experience
- **Real-time Comments**: WebSocket-powered live commenting system
- **Advanced Search**: Elasticsearch-powered full-text search with autocomplete
- **Smart Recommendations**: ML-driven content recommendation engine
- **Content Moderation**: AI-powered content filtering and spam detection

### Enterprise Features
- **Analytics Dashboard**: Comprehensive video and user analytics
- **Monitoring & Observability**: Prometheus + Grafana monitoring stack
- **Caching Layer**: Redis-powered caching for optimal performance
- **Rate Limiting**: Advanced rate limiting and DDoS protection
- **Security**: JWT authentication, CORS, helmet security headers
- **Scalability**: Horizontal scaling with Docker containers

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Redis         │◄──►│   Processing    │    │   Elasticsearch │
│   (Cache)       │    │   (Bull Queue)  │    │   (Search)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠 Technology Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis
- **Search**: Elasticsearch
- **Queue**: Bull (Redis-based)
- **Video Processing**: FFmpeg
- **Authentication**: JWT + Google OAuth

### Frontend
- **Framework**: Next.js 15 (React 19)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: SWR
- **Real-time**: Socket.IO

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston
- **Error Tracking**: Sentry

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for development)
- 8GB+ RAM (recommended)

### Production Deployment

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd origin
   ```

2. **Set up environment variables**
   ```bash
   cp origin-backend/.env.example origin-backend/.env
   cp origin-frontend/.env.example origin-frontend/.env
   
   # Edit the .env files with your actual values
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3002
   - Backend API: http://localhost:3000
   - Grafana: http://localhost:3001 (admin/admin)
   - Prometheus: http://localhost:9090
   - Elasticsearch: http://localhost:9200

### Development Setup

1. **Install dependencies**
   ```bash
   cd origin-backend && npm install
   cd ../origin-frontend && npm install
   ```

2. **Start services separately**
   ```bash
   # Terminal 1 - Backend
   cd origin-backend
   npm run start:dev
   
   # Terminal 2 - Frontend  
   cd origin-frontend
   npm run dev
   
   # Terminal 3 - Infrastructure
   docker-compose up postgres redis elasticsearch
   ```

## 📊 Monitoring & Observability

### Health Checks
- **Application Health**: `/health`
- **Readiness**: `/ready`  
- **Liveness**: `/live`
- **Metrics**: `/metrics` (Prometheus format)

### Key Metrics
- Video view counts and engagement
- API response times and error rates  
- Database connection pools
- Cache hit ratios
- Video processing queue status
- Real-time WebSocket connections

### Grafana Dashboards
- System Overview
- API Performance
- Video Analytics
- User Engagement
- Error Tracking

## 🔒 Security Features

- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control
- **Rate Limiting**: Configurable per endpoint
- **Content Security**: Helmet.js security headers
- **Input Validation**: Class-validator with sanitization
- **Content Moderation**: AI-powered spam and profanity detection
- **File Security**: Virus scanning and file type validation

## 📈 Performance Features

- **Adaptive Bitrate Streaming**: Multiple video qualities
- **CDN Integration**: Ready for CloudFlare/AWS CloudFront
- **Database Optimization**: Proper indexing and query optimization
- **Redis Caching**: Multi-layer caching strategy
- **Image Optimization**: Automatic image compression
- **Lazy Loading**: Progressive content loading
- **Connection Pooling**: Optimized database connections

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your-password
DB_NAME=origin

# Redis
REDIS_HOST=localhost  
REDIS_PORT=6379

# Search
ELASTICSEARCH_NODE=http://localhost:9200

# Authentication
JWT_SECRET=your-super-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

**Frontend (.env)**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

## 🚀 Scaling for Production

### Horizontal Scaling
- Use Docker Swarm or Kubernetes
- Load balance with multiple backend instances
- Separate read/write database replicas
- Redis Cluster for cache scaling

### Performance Optimization
- Enable Redis persistence
- Configure PostgreSQL for high load
- Use CDN for static assets
- Implement database sharding for large datasets

### Security Hardening
- Use SSL/TLS certificates
- Configure WAF (Web Application Firewall)
- Set up VPN for admin access
- Enable audit logging

## 🧪 Testing

```bash
# Backend tests
cd origin-backend
npm run test
npm run test:e2e
npm run test:cov

# Frontend tests
cd origin-frontend  
npm run test
```

## 📝 API Documentation

API documentation is available at `/api/docs` when running in development mode.

### Key Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/videos/upload` - Video upload
- `GET /api/videos/search` - Video search
- `GET /api/videos/:id/stream` - Video streaming
- `WebSocket /socket.io` - Real-time features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check the monitoring dashboards
- Review application logs

---

**Built with ❤️ to compete with YouTube**