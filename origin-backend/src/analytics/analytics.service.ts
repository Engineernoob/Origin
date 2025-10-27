import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CacheService } from '../cache/cache.service';
import { VideoAnalytics } from './analytics.entity';

export interface AnalyticsEvent {
  eventType: 'view' | 'like' | 'comment' | 'share' | 'subscribe' | 'watch_time';
  userId?: number;
  videoId?: number;
  channelId?: number;
  metadata?: any;
  timestamp?: Date;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
  referrer?: string;
}

export interface VideoMetrics {
  videoId: number;
  views: number;
  uniqueViews: number;
  likes: number;
  comments: number;
  shares: number;
  watchTime: number;
  averageWatchTime: number;
  retentionRate: number;
  clickThroughRate: number;
  engagement: number;
}

export interface ChannelMetrics {
  channelId: number;
  totalViews: number;
  subscribers: number;
  totalVideos: number;
  averageViewsPerVideo: number;
  engagementRate: number;
  growthRate: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(VideoAnalytics)
    private analyticsRepository: Repository<VideoAnalytics>,
    private cacheService: CacheService,
  ) {}

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Store in database
      const analytics = this.analyticsRepository.create({
        eventType: event.eventType,
        userId: event.userId,
        videoId: event.videoId,
        channelId: event.channelId,
        metadata: event.metadata || {},
        timestamp: event.timestamp || new Date(),
        sessionId: event.sessionId,
        userAgent: event.userAgent,
        ipAddress: event.ipAddress,
        deviceType: event.deviceType,
        referrer: event.referrer,
      });

      await this.analyticsRepository.save(analytics);

      // Update real-time counters
      await this.updateRealTimeMetrics(event);
    } catch (error) {
      this.logger.error('Error tracking analytics event:', error);
    }
  }

  private async updateRealTimeMetrics(event: AnalyticsEvent): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    switch (event.eventType) {
      case 'view':
        if (event.videoId) {
          await this.cacheService.incrementViewCount(event.videoId.toString());

          // Daily video views
          const dailyViewKey = `analytics:video:${event.videoId}:views:${today}`;
          await this.cacheService.redis.incr(dailyViewKey);
          await this.cacheService.redis.expire(dailyViewKey, 86400 * 7); // Keep for 7 days

          // Unique views (using user session)
          if (event.sessionId) {
            const uniqueViewKey = `analytics:video:${event.videoId}:unique_views:${today}`;
            await this.cacheService.redis.sadd(uniqueViewKey, event.sessionId);
            await this.cacheService.redis.expire(uniqueViewKey, 86400 * 7);
          }
        }
        break;

      case 'like':
        if (event.videoId) {
          const likesKey = `analytics:video:${event.videoId}:likes:${today}`;
          await this.cacheService.redis.incr(likesKey);
          await this.cacheService.redis.expire(likesKey, 86400 * 7);
        }
        break;

      case 'watch_time':
        if (event.videoId && event.metadata?.watchTime) {
          const watchTimeKey = `analytics:video:${event.videoId}:watch_time:${today}`;
          await this.cacheService.redis.incrby(
            watchTimeKey,
            event.metadata.watchTime,
          );
          await this.cacheService.redis.expire(watchTimeKey, 86400 * 7);
        }
        break;
    }
  }

  async getVideoMetrics(videoId: number, days = 30): Promise<VideoMetrics> {
    const cacheKey = `analytics:video_metrics:${videoId}:${days}d`;
    const cached = await this.cacheService.get<VideoMetrics>(cacheKey);

    if (cached) {
      return cached;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Aggregate data from database
    const analytics = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select([
        'eventType',
        'COUNT(*) as count',
        "AVG(CAST(metadata->>'watchTime' AS INTEGER)) as avgWatchTime",
      ])
      .where('videoId = :videoId', { videoId })
      .andWhere('timestamp >= :startDate', { startDate })
      .groupBy('eventType')
      .getRawMany();

    // Build metrics object
    const metrics: VideoMetrics = {
      videoId,
      views: 0,
      uniqueViews: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      watchTime: 0,
      averageWatchTime: 0,
      retentionRate: 0,
      clickThroughRate: 0,
      engagement: 0,
    };

    // Process analytics data
    analytics.forEach((row) => {
      switch (row.eventType) {
        case 'view':
          metrics.views = parseInt(row.count);
          break;
        case 'like':
          metrics.likes = parseInt(row.count);
          break;
        case 'comment':
          metrics.comments = parseInt(row.count);
          break;
        case 'share':
          metrics.shares = parseInt(row.count);
          break;
        case 'watch_time':
          metrics.averageWatchTime = parseFloat(row.avgWatchTime) || 0;
          break;
      }
    });

    // Calculate engagement rate
    if (metrics.views > 0) {
      metrics.engagement =
        ((metrics.likes + metrics.comments + metrics.shares) / metrics.views) *
        100;
    }

    // Get unique views from Redis
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const uniqueViewKey = `analytics:video:${videoId}:unique_views:${dateStr}`;
      const uniqueViews = await this.cacheService.redis.scard(uniqueViewKey);
      metrics.uniqueViews += uniqueViews;
    }

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, metrics, 3600);

    return metrics;
  }

  async getChannelMetrics(
    channelId: number,
    days = 30,
  ): Promise<ChannelMetrics> {
    const cacheKey = `analytics:channel_metrics:${channelId}:${days}d`;
    const cached = await this.cacheService.get<ChannelMetrics>(cacheKey);

    if (cached) {
      return cached;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select([
        'eventType',
        'COUNT(*) as count',
        'COUNT(DISTINCT videoId) as uniqueVideos',
      ])
      .where('channelId = :channelId', { channelId })
      .andWhere('timestamp >= :startDate', { startDate })
      .groupBy('eventType')
      .getRawMany();

    const metrics: ChannelMetrics = {
      channelId,
      totalViews: 0,
      subscribers: 0,
      totalVideos: 0,
      averageViewsPerVideo: 0,
      engagementRate: 0,
      growthRate: 0,
    };

    // Process analytics data
    analytics.forEach((row) => {
      switch (row.eventType) {
        case 'view':
          metrics.totalViews = parseInt(row.count);
          metrics.totalVideos = parseInt(row.uniqueVideos);
          break;
        case 'subscribe':
          metrics.subscribers = parseInt(row.count);
          break;
      }
    });

    if (metrics.totalVideos > 0) {
      metrics.averageViewsPerVideo = metrics.totalViews / metrics.totalVideos;
    }

    // Cache for 2 hours
    await this.cacheService.set(cacheKey, metrics, 7200);

    return metrics;
  }

  async getTrendingVideos(limit = 10, timeRange = '24h'): Promise<any[]> {
    const cacheKey = `analytics:trending:${timeRange}:${limit}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    let hours = 24;
    switch (timeRange) {
      case '1h':
        hours = 1;
        break;
      case '6h':
        hours = 6;
        break;
      case '24h':
        hours = 24;
        break;
      case '7d':
        hours = 168;
        break;
    }

    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const trending = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select([
        'videoId',
        'COUNT(*) as score',
        "COUNT(CASE WHEN eventType = 'view' THEN 1 END) as views",
        "COUNT(CASE WHEN eventType = 'like' THEN 1 END) as likes",
        "COUNT(CASE WHEN eventType = 'comment' THEN 1 END) as comments",
        "COUNT(CASE WHEN eventType = 'share' THEN 1 END) as shares",
      ])
      .where('timestamp >= :startDate', { startDate })
      .groupBy('videoId')
      .orderBy('score', 'DESC')
      .limit(limit)
      .getRawMany();

    // Calculate trending score (views * 1 + likes * 5 + comments * 10 + shares * 20)
    const trendingWithScore = trending
      .map((video) => ({
        ...video,
        trendingScore:
          parseInt(video.views) * 1 +
          parseInt(video.likes) * 5 +
          parseInt(video.comments) * 10 +
          parseInt(video.shares) * 20,
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore);

    // Cache for 15 minutes
    await this.cacheService.set(cacheKey, trendingWithScore, 900);

    return trendingWithScore;
  }

  async getViewerDemographics(videoId: number): Promise<any> {
    const cacheKey = `analytics:demographics:${videoId}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const demographics = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select(['deviceType', 'COUNT(*) as count'])
      .where('videoId = :videoId', { videoId })
      .andWhere('eventType = :eventType', { eventType: 'view' })
      .andWhere('timestamp >= :startDate', {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      })
      .groupBy('deviceType')
      .getRawMany();

    const result = {
      devices: demographics,
      totalViews: demographics.reduce((sum, d) => sum + parseInt(d.count), 0),
    };

    // Cache for 2 hours
    await this.cacheService.set(cacheKey, result, 7200);

    return result;
  }

  async generateReport(
    type: 'daily' | 'weekly' | 'monthly',
    entityId?: number,
  ): Promise<any> {
    // Implementation for generating analytics reports
    const reportKey = `analytics:report:${type}:${entityId || 'global'}:${new Date().toISOString().split('T')[0]}`;

    // This would generate comprehensive analytics reports
    // with charts, trends, insights, etc.

    return {
      type,
      entityId,
      generatedAt: new Date(),
      // ... report data
    };
  }
}
