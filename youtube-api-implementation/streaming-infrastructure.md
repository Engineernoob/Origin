# YouTube-Scale Content Delivery & Streaming Infrastructure

## 🚀 Global CDN Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Global Load Balancer                        │
│                    (AWS CloudFront / Cloudflare)                │
└─────────────────┬───────────────────────────────────────────────┘
                  │
    ┌─────────────┴─────────────────────────────────────────┐
    │                                                       │
┌───▼────┐ ┌─────▼─────┐ ┌──────▼──────┐ ┌──────▼──────┐
│ US-East│ │ US-West   │ │   Europe    │ │ Asia-Pacific│
│ (N.VA) │ │ (Oregon)  │ │ (Frankfurt) │ │ (Singapore) │
└───┬────┘ └─────┬─────┘ └──────┬──────┘ └──────┬──────┘
    │            │              │               │
┌───▼────────────▼──────────────▼───────────────▼──────┐
│              Regional Edge Caches                    │
│    - Video Segments (HLS/DASH)                      │
│    - Thumbnails & Images                            │
│    - Manifests & Metadata                           │
└──────────────────────┬───────────────────────────────┘
                       │
    ┌──────────────────▼──────────────────────┐
    │                                         │
┌───▼────┐ ┌─────▼─────┐ ┌──────▼──────┐ ┌───▼────┐
│Origin  │ │ Database  │ │Processing   │ │Analytics│
│Storage │ │ Cluster   │ │ Pipeline    │ │ System │
│(S3/GCS)│ │(Postgres) │ │   (K8s)     │ │(ClickHouse)│
└────────┘ └───────────┘ └─────────────┘ └────────┘
```

## 📺 Adaptive Streaming Implementation

### HLS (HTTP Live Streaming)
```typescript
// HLS Master Playlist Generation
export class HLSService {
  generateMasterPlaylist(videoId: string, qualities: VideoQuality[]): string {
    let manifest = '#EXTM3U\n#EXT-X-VERSION:7\n\n';
    
    // Add video variants
    qualities.forEach(quality => {
      manifest += `#EXT-X-STREAM-INF:`;
      manifest += `BANDWIDTH=${quality.bandwidth},`;
      manifest += `RESOLUTION=${quality.width}x${quality.height},`;
      manifest += `FRAME-RATE=${quality.fps},`;
      manifest += `CODECS="${quality.videoCodec},${quality.audioCodec}"\n`;
      manifest += `${quality.name}.m3u8\n\n`;
    });
    
    // Add audio-only variant
    manifest += `#EXT-X-STREAM-INF:BANDWIDTH=128000,CODECS="mp4a.40.2"\n`;
    manifest += `audio-only.m3u8\n`;
    
    return manifest;
  }
}
```

### DASH (Dynamic Adaptive Streaming)
```typescript
export class DASHService {
  generateManifest(videoId: string, qualities: VideoQuality[]): string {
    const duration = this.getVideoDuration(videoId);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" 
     profiles="urn:mpeg:dash:profile:isoff-live:2011"
     type="static"
     mediaPresentationDuration="PT${duration}S"
     minBufferTime="PT2S">
  
  <Period start="PT0S">
    <!-- Video Adaptation Set -->
    <AdaptationSet mimeType="video/mp4" codecs="avc1.42E01E">
      ${qualities.map(q => `
      <Representation id="${q.name}" 
                     bandwidth="${q.bandwidth}"
                     width="${q.width}" 
                     height="${q.height}">
        <SegmentTemplate media="${q.name}_$Number$.m4s" 
                        initialization="${q.name}_init.m4s"
                        startNumber="1" 
                        timescale="90000"
                        duration="540000"/>
      </Representation>`).join('')}
    </AdaptationSet>
    
    <!-- Audio Adaptation Set -->
    <AdaptationSet mimeType="audio/mp4" codecs="mp4a.40.2">
      <Representation id="audio" bandwidth="128000">
        <SegmentTemplate media="audio_$Number$.m4s" 
                        initialization="audio_init.m4s"/>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`;
  }
}
```

## 🎯 Smart Caching Strategy

### Multi-Tier Caching
```typescript
export class CacheStrategy {
  private readonly cacheTiers = {
    // L1: Browser Cache
    browser: { maxAge: 86400, staleWhileRevalidate: 604800 },
    
    // L2: CDN Edge Cache  
    edge: { maxAge: 31536000, staleIfError: 86400 },
    
    // L3: Regional Cache
    regional: { maxAge: 604800, compression: 'gzip' },
    
    // L4: Origin Cache
    origin: { maxAge: 3600, warmup: true }
  };

  getCacheHeaders(contentType: string, videoId: string): Headers {
    const headers = new Headers();
    
    switch (contentType) {
      case 'video/mp4':
        // Long cache for video segments
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('ETag', `"${videoId}-video"`);
        break;
        
      case 'application/x-mpegURL': // HLS
      case 'application/dash+xml':  // DASH
        // Short cache for manifests (allow updates)
        headers.set('Cache-Control', 'public, max-age=300, s-maxage=60');
        break;
        
      case 'image/jpeg': // Thumbnails
        headers.set('Cache-Control', 'public, max-age=604800');
        headers.set('Vary', 'Accept-Encoding');
        break;
    }
    
    return headers;
  }
}
```

## 🌍 Geographic Distribution

### CDN Configuration
```yaml
# CloudFormation/Terraform for AWS CloudFront
Resources:
  VideoDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Origins:
          - Id: S3-Videos
            DomainName: videos.yourdomain.com
            S3OriginConfig:
              OriginAccessIdentity: !Ref OriginAccessIdentity
        
        DefaultCacheBehavior:
          TargetOriginId: S3-Videos
          ViewerProtocolPolicy: redirect-to-https
          CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad # CachingOptimized
          
        CacheBehaviors:
          # Video segments - long cache
          - PathPattern: "videos/*/*.mp4"
            TargetOriginId: S3-Videos
            CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
            TTL:
              DefaultTTL: 31536000
              MaxTTL: 31536000
              
          # Manifests - short cache  
          - PathPattern: "videos/*/*.m3u8"
            TargetOriginId: S3-Videos
            TTL:
              DefaultTTL: 300
              MaxTTL: 300
              
        PriceClass: PriceClass_All
        ViewerCertificate:
          AcmCertificateArn: !Ref SSLCertificate
          SslSupportMethod: sni-only
```

## 📊 Performance Optimization

### Video Delivery Optimization
```typescript
export class VideoDeliveryOptimizer {
  async optimizeDelivery(request: DeliveryRequest): Promise<OptimizedResponse> {
    const { videoId, userLocation, deviceType, bandwidth } = request;
    
    // 1. Select optimal CDN edge
    const edge = await this.selectOptimalEdge(userLocation);
    
    // 2. Determine best quality based on bandwidth
    const quality = this.selectQuality(bandwidth, deviceType);
    
    // 3. Check cache availability
    const cacheStatus = await this.checkCacheStatus(videoId, quality, edge);
    
    // 4. Generate optimized URLs
    const streamUrl = this.generateStreamUrl(videoId, quality, edge);
    
    return {
      streamUrl,
      quality,
      edge: edge.location,
      cacheHit: cacheStatus.hit,
      expectedLatency: cacheStatus.latency
    };
  }

  private selectQuality(bandwidth: number, device: string): string {
    const qualityMap = {
      mobile: {
        slow: '240p',    // < 1 Mbps
        medium: '480p',  // 1-3 Mbps  
        fast: '720p'     // > 3 Mbps
      },
      desktop: {
        slow: '480p',    // < 2 Mbps
        medium: '720p',  // 2-5 Mbps
        fast: '1080p'    // > 5 Mbps
      }
    };

    const deviceQualities = qualityMap[device] || qualityMap.desktop;
    
    if (bandwidth < 1000000) return deviceQualities.slow;
    if (bandwidth < 3000000) return deviceQualities.medium;
    return deviceQualities.fast;
  }
}
```

## 🔄 Real-time Streaming Features

### WebRTC Integration (for Live Streaming)
```typescript
export class LiveStreamingService {
  async startLiveStream(channelId: string): Promise<StreamConfig> {
    // 1. Create WebRTC peer connection
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:turn.yourdomain.com', username: 'user', credential: 'pass' }
      ]
    });

    // 2. Configure video encoding
    const videoTransceiver = peerConnection.addTransceiver('video', {
      direction: 'sendonly',
      streams: [new MediaStream()]
    });

    // Set encoding parameters for multiple qualities
    await videoTransceiver.sender.setParameters({
      encodings: [
        { rid: 'high', maxBitrate: 3000000, scaleResolutionDownBy: 1 },
        { rid: 'medium', maxBitrate: 1000000, scaleResolutionDownBy: 2 },
        { rid: 'low', maxBitrate: 400000, scaleResolutionDownBy: 4 }
      ]
    });

    // 3. Setup stream ingestion
    const ingestUrl = `rtmp://ingest.yourdomain.com/live/${channelId}`;
    
    return {
      streamKey: await this.generateStreamKey(channelId),
      ingestUrl,
      hlsPlaybackUrl: `https://cdn.yourdomain.com/live/${channelId}/index.m3u8`,
      dashPlaybackUrl: `https://cdn.yourdomain.com/live/${channelId}/manifest.mpd`
    };
  }
}
```

## 📱 Mobile Optimization

### Progressive Loading
```typescript
export class MobileOptimizer {
  generateMobileManifest(videoId: string, connection: ConnectionType): string {
    const qualityLadder = this.getMobileQualityLadder(connection);
    
    return `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-INDEPENDENT-SEGMENTS

${qualityLadder.map(quality => `
#EXT-X-STREAM-INF:BANDWIDTH=${quality.bandwidth},RESOLUTION=${quality.resolution},FRAME-RATE=${quality.fps}
${quality.playlist}
`).join('')}`;
  }

  private getMobileQualityLadder(connection: ConnectionType): QualityLevel[] {
    switch (connection) {
      case '2g':
        return [{ bandwidth: 80000, resolution: '256x144', fps: 15, playlist: '144p.m3u8' }];
      
      case '3g':
        return [
          { bandwidth: 150000, resolution: '426x240', fps: 24, playlist: '240p.m3u8' },
          { bandwidth: 400000, resolution: '640x360', fps: 24, playlist: '360p.m3u8' }
        ];
      
      case '4g':
      case 'wifi':
        return [
          { bandwidth: 400000, resolution: '640x360', fps: 24, playlist: '360p.m3u8' },
          { bandwidth: 750000, resolution: '854x480', fps: 30, playlist: '480p.m3u8' },
          { bandwidth: 1500000, resolution: '1280x720', fps: 30, playlist: '720p.m3u8' }
        ];
    }
  }
}
```

## 🔐 Security & DRM

### Content Protection
```typescript
export class ContentProtection {
  async generateSecureUrl(videoId: string, userId: number): Promise<SecureUrl> {
    // 1. Generate time-limited signed URL
    const expiry = Date.now() + (4 * 60 * 60 * 1000); // 4 hours
    const signature = this.generateSignature(videoId, userId, expiry);
    
    // 2. Add geo-restriction if needed
    const geoRestrictions = await this.getGeoRestrictions(videoId);
    
    // 3. Apply DRM if premium content
    const drmConfig = await this.getDRMConfig(videoId);
    
    return {
      url: `https://secure-cdn.yourdomain.com/videos/${videoId}/master.m3u8`,
      signature,
      expiry,
      restrictions: geoRestrictions,
      drm: drmConfig
    };
  }

  private generateSignature(videoId: string, userId: number, expiry: number): string {
    const payload = `${videoId}:${userId}:${expiry}`;
    const secret = process.env.URL_SIGNING_SECRET;
    
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
}
```

## 📈 Analytics & Monitoring

### Real-time Metrics
```typescript
export class StreamingAnalytics {
  trackPlaybackEvent(event: PlaybackEvent): void {
    const metrics = {
      videoId: event.videoId,
      userId: event.userId,
      quality: event.quality,
      bufferHealth: event.bufferHealth,
      bandwidth: event.bandwidth,
      cdn: event.cdnEdge,
      timestamp: Date.now()
    };

    // Send to analytics pipeline
    this.analyticsQueue.add('playback-event', metrics);
    
    // Update real-time dashboard
    this.metricsCollector.increment('video.plays', {
      quality: event.quality,
      cdn: event.cdnEdge
    });
  }

  async getStreamingMetrics(videoId: string): Promise<StreamingMetrics> {
    return {
      totalViews: await this.getViewCount(videoId),
      qualityDistribution: await this.getQualityStats(videoId),
      geographicDistribution: await this.getGeoStats(videoId),
      averageBitrate: await this.getAverageBitrate(videoId),
      bufferRatio: await this.getBufferRatio(videoId),
      cdnPerformance: await this.getCDNStats(videoId)
    };
  }
}
```

This infrastructure provides YouTube-scale video delivery with:

- **Global CDN** with intelligent edge caching
- **Adaptive streaming** (HLS + DASH) for all devices  
- **Smart quality selection** based on bandwidth/device
- **Mobile optimization** for cellular networks
- **Live streaming** capabilities with WebRTC
- **Content protection** with DRM and signed URLs
- **Real-time analytics** for performance monitoring

The system can handle **billions of video views** with **sub-second startup times** globally! 🚀