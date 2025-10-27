# YouTube API Setup for Origin Platform

## 🎯 **Overview**
The Origin platform uses YouTube API to train the recommendation system and enhance video discovery. This setup includes:

- ✅ **ML Training**: Train recommendation models on YouTube video data
- ✅ **Video Search**: Find relevant content from YouTube
- ✅ **Trending Content**: Get popular videos by category/region  
- ✅ **Smart Recommendations**: ML-powered video suggestions

## 🔑 **YouTube API Key Setup**

### 1. **Get YouTube API Key**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **YouTube Data API v3**
4. Create credentials → API Key
5. **Important**: Restrict the API key for security

### 2. **Configure API Key**
Set the environment variable:

```bash
# For local development
export YOUTUBE_API_KEY=your_actual_youtube_api_key

# For Docker/VPS
echo "YOUTUBE_API_KEY=your_actual_youtube_api_key" >> .env

# For Vercel (in dashboard)
YOUTUBE_API_KEY=your_actual_youtube_api_key
```

### 3. **API Key Security**
- **Restrict by IP**: Only your server's IP addresses
- **Restrict by referrer**: Only your domains
- **Set daily quotas**: Prevent overusage
- **Monitor usage**: Track API calls

## 🚀 **API Endpoints Available**

### **Video Management**
```
GET /api/youtube/search?q=animation&maxResults=20
GET /api/youtube/trending?region=US&categoryId=10
GET /api/youtube/quota
```

### **Recommendation System**  
```
GET /api/recommendations?algorithm=collaborative_filtering
GET /api/recommendations?videoId=1&train=true
POST /api/youtube/train
```

### **Health Check**
```bash
GET /health
# Returns YouTube API status and configuration
```

## 🧠 **ML Training Features**

### **Training Algorithms**
- **Collaborative Filtering**: Based on user behavior patterns  
- **Content-Based**: Video similarity and metadata
- **Hybrid**: Combines multiple approaches
- **Neural Networks**: Deep learning recommendations

### **Training Data Sources**
- YouTube video metadata (titles, descriptions, tags)
- View counts and engagement metrics
- Category and topic information
- Channel data and user interactions

### **Model Features**
- Watch time patterns
- Like/dislike ratios  
- Comments and shares
- Viewing sessions
- User preferences

## 📊 **API Quota Management**

### **YouTube API Costs**
```
Search operations: 100 units per request
Trending videos: 100 units per request  
Video details: 1 unit per video
Categories: 1 unit per request
Daily limit: 10,000 units (default quota)
```

### **Cost Optimization**
- **Cache results**: Store search results locally
- **Batch operations**: Combine multiple requests
- **Rate limiting**: Prevent API abuse
- **Smart quotas**: Monitor and adjust usage

## 🔧 **Testing YouTube Integration**

### 1. **Check API Key**
```bash
curl https://originvideo.duckdns.org/api/youtube/quota
```

### 2. **Test Search**
```bash  
curl "https://originvideo.duckdns.org/api/youtube/search?q=blockchain&maxResults=5"
```

### 3. **Train Model**
```bash
curl -X POST https://originvideo.duckdns.org/api/youtube/train
```

### 4. **Test Recommendations**
```bash
curl "https://originvideo.duckdns.org/api/recommendations?algorithm=mixed&train=true"
```

## 🎬 **Production Deployment**

### **Environment Variables**
```bash
# Required
YOUTUBE_API_KEY=your_api_key_here

# Optional  
YOUTUBE_API_QUOTA_LIMIT=9000
YOUTUBE_CACHE_TTL=3600
ML_TRAINING_INTERVAL=3600000 # 1 hour
```

### **Docker Configuration**
```bash
docker run -e YOUTUBE_API_KEY=$YOUTUBE_API_KEY -p 8080:8080 origin-backend
```

### **Monitoring**
- API usage tracking
- Model performance metrics  
- Recommendation accuracy
- System health checks

## 🚨 **Troubleshooting**

### **Common Issues**
1. **API Key Not Working**
   - Check key is enabled for YouTube Data API v3
   - Verify IP restrictions
   - Check daily quota exceeded

2. **High API Costs**
   - Enable result caching
   - Reduce search frequency  
   - Use trending videos instead of search

3. **Poor Recommendations**
   - Retrain model with new data
   - Check algorithm parameters
   - Validate training data quality

### **Debug Mode**
Enable detailed logging:
```bash
export DEBUG=youtube
export DEBUG=ml-training
```

## 📈 **Performance Optimization**

### **Caching Strategy**
- Redis for API results
- Local memory for popular content
- Database for user preferences
- CDN for video metadata

### **Scalability**
- Load balancer for API requests
- Queue system for training jobs
- Background worker for ML updates
- Database optimization

## 🎯 **Next Steps**

1. **Configure API Key**: Set up YouTube API credentials
2. **Test Integration**: Verify all endpoints work
3. **Train Model**: Run initial training pipeline
4. **Monitor Performance**: Track recommendations accuracy
5. **Scale Up**: Add more data sources as needed

## 🔐 **Security Considerations**

- **API Key Protection**: Never expose in frontend code
- **Request Validation**: Sanitize all inputs  
- **Rate Limiting**: Prevent API abuse
- **Data Privacy**: Handle user data properly
- **Access Control**: Secure training endpoints

---

Once configured, your Origin platform will have sophisticated ML-powered recommendations trained on real YouTube data! 🚀
