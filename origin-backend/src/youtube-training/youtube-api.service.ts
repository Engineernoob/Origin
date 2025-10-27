import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import axios from 'axios';
import { CacheService } from '../cache/cache.service';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  tags: string[];
  categoryId: string;
  thumbnail: string;
  statistics: {
    viewCount: string;
    likeCount: string;
    dislikeCount: string;
    favoriteCount: string;
    commentCount: string;
  };
}

export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  nextPageToken?: string;
  totalResults: number;
}

@Injectable()
export class YouTubeApiService {
  private readonly logger = new Logger(YouTubeApiService.name);
  private readonly apiKey: string;
  private readonly quotaLimit: number;
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';
  private dailyQuotaUsed = 0;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
    @InjectQueue('youtube-training') private trainingQueue: Queue,
  ) {
    this.apiKey = this.configService.get('YOUTUBE_API_KEY');
    this.quotaLimit = parseInt(
      this.configService.get('YOUTUBE_QUOTA_LIMIT', '10000'),
    );

    if (!this.apiKey) {
      this.logger.warn(
        'YouTube API key not configured - training features disabled',
      );
    }
  }

  async searchVideos(
    query: string,
    maxResults = 50,
    pageToken?: string,
  ): Promise<YouTubeSearchResult> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not configured');
    }

    // Check quota
    if (this.dailyQuotaUsed >= this.quotaLimit) {
      throw new Error('YouTube API quota exceeded for today');
    }

    const cacheKey = `youtube:search:${query}:${pageToken || 'first'}:${maxResults}`;
    const cached = await this.cacheService.get<YouTubeSearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Step 1: Search for video IDs
      const searchResponse = await axios.get(`${this.baseUrl}/search`, {
        params: {
          key: this.apiKey,
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults,
          pageToken,
          order: 'relevance',
          videoEmbeddable: 'true',
          videoSyndicated: 'true',
        },
      });

      this.dailyQuotaUsed += 100; // Search costs 100 units

      const videoIds = searchResponse.data.items.map(
        (item: any) => item.id.videoId,
      );

      if (videoIds.length === 0) {
        return { videos: [], totalResults: 0 };
      }

      // Step 2: Get detailed video information
      const videosResponse = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          part: 'snippet,statistics,contentDetails',
          id: videoIds.join(','),
        },
      });

      this.dailyQuotaUsed += 1; // Videos endpoint costs 1 unit per video

      const videos: YouTubeVideo[] = videosResponse.data.items.map(
        (item: any) => ({
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          viewCount: parseInt(item.statistics.viewCount || '0'),
          likeCount: parseInt(item.statistics.likeCount || '0'),
          commentCount: parseInt(item.statistics.commentCount || '0'),
          duration: item.contentDetails.duration,
          tags: item.snippet.tags || [],
          categoryId: item.snippet.categoryId,
          thumbnail:
            item.snippet.thumbnails.high?.url ||
            item.snippet.thumbnails.default?.url,
          statistics: item.statistics,
        }),
      );

      const result: YouTubeSearchResult = {
        videos,
        nextPageToken: searchResponse.data.nextPageToken,
        totalResults: searchResponse.data.pageInfo.totalResults,
      };

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, result, 3600);

      return result;
    } catch (error) {
      this.logger.error(
        `YouTube API error for query "${query}":`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async getTrendingVideos(
    regionCode = 'US',
    categoryId?: string,
  ): Promise<YouTubeVideo[]> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not configured');
    }

    const cacheKey = `youtube:trending:${regionCode}:${categoryId || 'all'}`;
    const cached = await this.cacheService.get<YouTubeVideo[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          part: 'snippet,statistics,contentDetails',
          chart: 'mostPopular',
          regionCode,
          categoryId,
          maxResults: 50,
        },
      });

      this.dailyQuotaUsed += 1;

      const videos: YouTubeVideo[] = response.data.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        viewCount: parseInt(item.statistics.viewCount || '0'),
        likeCount: parseInt(item.statistics.likeCount || '0'),
        commentCount: parseInt(item.statistics.commentCount || '0'),
        duration: item.contentDetails.duration,
        tags: item.snippet.tags || [],
        categoryId: item.snippet.categoryId,
        thumbnail:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.default?.url,
        statistics: item.statistics,
      }));

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, videos, 1800);

      return videos;
    } catch (error) {
      this.logger.error(
        'YouTube API error for trending videos:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async getChannelVideos(
    channelId: string,
    maxResults = 50,
  ): Promise<YouTubeVideo[]> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not configured');
    }

    const cacheKey = `youtube:channel:${channelId}:${maxResults}`;
    const cached = await this.cacheService.get<YouTubeVideo[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get channel's uploads playlist
      const channelResponse = await axios.get(`${this.baseUrl}/channels`, {
        params: {
          key: this.apiKey,
          part: 'contentDetails',
          id: channelId,
        },
      });

      this.dailyQuotaUsed += 1;

      const uploadsPlaylistId =
        channelResponse.data.items[0]?.contentDetails?.relatedPlaylists
          ?.uploads;

      if (!uploadsPlaylistId) {
        return [];
      }

      // Get videos from uploads playlist
      const playlistResponse = await axios.get(
        `${this.baseUrl}/playlistItems`,
        {
          params: {
            key: this.apiKey,
            part: 'snippet',
            playlistId: uploadsPlaylistId,
            maxResults,
          },
        },
      );

      this.dailyQuotaUsed += 1;

      const videoIds = playlistResponse.data.items.map(
        (item: any) => item.snippet.resourceId.videoId,
      );

      // Get detailed video information
      const videosResponse = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          part: 'snippet,statistics,contentDetails',
          id: videoIds.join(','),
        },
      });

      this.dailyQuotaUsed += 1;

      const videos: YouTubeVideo[] = videosResponse.data.items.map(
        (item: any) => ({
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          viewCount: parseInt(item.statistics.viewCount || '0'),
          likeCount: parseInt(item.statistics.likeCount || '0'),
          commentCount: parseInt(item.statistics.commentCount || '0'),
          duration: item.contentDetails.duration,
          tags: item.snippet.tags || [],
          categoryId: item.snippet.categoryId,
          thumbnail:
            item.snippet.thumbnails.high?.url ||
            item.snippet.thumbnails.default?.url,
          statistics: item.statistics,
        }),
      );

      // Cache for 2 hours
      await this.cacheService.set(cacheKey, videos, 7200);

      return videos;
    } catch (error) {
      this.logger.error(
        `YouTube API error for channel ${channelId}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async collectTrainingData(
    categories: string[] = [],
    sampleSize = 1000,
  ): Promise<void> {
    if (!this.configService.get('YOUTUBE_TRAINING_ENABLED', 'false')) {
      this.logger.log('YouTube training data collection is disabled');
      return;
    }

    this.logger.log(
      `Starting training data collection for ${sampleSize} videos`,
    );

    // Queue training data collection job
    await this.trainingQueue.add('collect-training-data', {
      categories,
      sampleSize,
      startTime: new Date(),
    });
  }

  async getVideoCategories(): Promise<{ [key: string]: string }> {
    const cacheKey = 'youtube:categories';
    const cached = await this.cacheService.get<{ [key: string]: string }>(
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/videoCategories`, {
        params: {
          key: this.apiKey,
          part: 'snippet',
          regionCode: 'US',
        },
      });

      this.dailyQuotaUsed += 1;

      const categories = response.data.items.reduce((acc: any, item: any) => {
        acc[item.id] = item.snippet.title;
        return acc;
      }, {});

      // Cache for 24 hours
      await this.cacheService.set(cacheKey, categories, 86400);

      return categories;
    } catch (error) {
      this.logger.error(
        'YouTube API error for categories:',
        error.response?.data || error.message,
      );
      return {};
    }
  }

  getQuotaUsage(): { used: number; limit: number; remaining: number } {
    return {
      used: this.dailyQuotaUsed,
      limit: this.quotaLimit,
      remaining: this.quotaLimit - this.dailyQuotaUsed,
    };
  }

  resetDailyQuota(): void {
    this.dailyQuotaUsed = 0;
    this.logger.log('YouTube API quota reset for new day');
  }
}
