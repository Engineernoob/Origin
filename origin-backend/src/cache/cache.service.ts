import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.redis.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Error invalidating cache pattern ${pattern}:`, error);
    }
  }

  // Video-specific cache methods
  async cacheVideoData(videoId: string, data: any, ttl = 3600): Promise<void> {
    await this.set(`video:${videoId}`, data, ttl);
  }

  async getVideoData(videoId: string): Promise<any> {
    return await this.get(`video:${videoId}`);
  }

  async cacheVideoList(key: string, videos: any[], ttl = 300): Promise<void> {
    await this.set(`videos:${key}`, videos, ttl);
  }

  async getVideoList(key: string): Promise<any[]> {
    return (await this.get(`videos:${key}`)) || [];
  }

  async incrementViewCount(videoId: string): Promise<number> {
    try {
      return await this.redis.incr(`views:${videoId}`);
    } catch (error) {
      this.logger.error(`Error incrementing view count for ${videoId}:`, error);
      return 0;
    }
  }

  async getViewCount(videoId: string): Promise<number> {
    try {
      const count = await this.redis.get(`views:${videoId}`);
      return parseInt(count || '0', 10);
    } catch (error) {
      this.logger.error(`Error getting view count for ${videoId}:`, error);
      return 0;
    }
  }

  // User session cache
  async cacheUserSession(
    userId: number,
    data: any,
    ttl = 86400,
  ): Promise<void> {
    await this.set(`session:${userId}`, data, ttl);
  }

  async getUserSession(userId: number): Promise<any> {
    return await this.get(`session:${userId}`);
  }

  // Trending videos cache
  async cacheTrendingVideos(videos: any[], ttl = 1800): Promise<void> {
    await this.set('trending:videos', videos, ttl);
  }

  async getTrendingVideos(): Promise<any[]> {
    return (await this.get('trending:videos')) || [];
  }

  // Rate limiting
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    try {
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, windowSeconds);
      }
      return current <= limit;
    } catch (error) {
      this.logger.error(`Error checking rate limit for ${key}:`, error);
      return true; // Allow on error
    }
  }
}
