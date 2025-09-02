import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CacheService } from '../cache/cache.service';
import { Video } from '../videos/videos.entity';
import { User } from '../users/users.entity';
import { VideoAnalytics } from '../analytics/analytics.entity';
import { MLTrainingService } from '../youtube-training/ml-training.service';

export interface RecommendationOptions {
  userId?: number;
  videoId?: number;
  limit?: number;
  algorithm?: 'collaborative' | 'content_based' | 'trending' | 'mixed';
  excludeWatched?: boolean;
}

export interface VideoScore {
  videoId: number;
  score: number;
  reason: string;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(VideoAnalytics)
    private analyticsRepository: Repository<VideoAnalytics>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cacheService: CacheService,
    private mlTrainingService?: MLTrainingService, // Optional for backwards compatibility
  ) {}

  async getRecommendations(options: RecommendationOptions): Promise<Video[]> {
    const {
      userId,
      videoId,
      limit = 20,
      algorithm = 'mixed',
      excludeWatched = true,
    } = options;

    const cacheKey = `recommendations:${algorithm}:${userId || 'anonymous'}:${videoId || 'none'}:${limit}`;
    
    // Try cache first
    const cached = await this.cacheService.get<number[]>(cacheKey);
    if (cached && cached.length > 0) {
      const videos = await this.videoRepository.find({
        where: { id: In(cached) },
        relations: ['user'],
      });
      
      // Maintain order from cache
      return cached.map(id => videos.find(v => v.id === id)).filter(Boolean);
    }

    let videoIds: number[] = [];

    switch (algorithm) {
      case 'collaborative':
        videoIds = await this.getCollaborativeRecommendations(userId, limit, excludeWatched);
        break;
      case 'content_based':
        videoIds = await this.getContentBasedRecommendations(videoId, userId, limit, excludeWatched);
        break;
      case 'trending':
        videoIds = await this.getTrendingRecommendations(limit);
        break;
      case 'mixed':
      default:
        videoIds = await this.getMixedRecommendations(userId, videoId, limit, excludeWatched);
        break;
    }

    // Enhance recommendations with ML predictions if available
    if (this.mlTrainingService && videoIds.length > 0) {
      videoIds = await this.enhanceWithMLPredictions(videoIds, userId);
    }

    // Cache recommendations for 30 minutes
    await this.cacheService.set(cacheKey, videoIds, 1800);

    const videos = await this.videoRepository.find({
      where: { id: In(videoIds) },
      relations: ['user'],
    });

    // Maintain order
    return videoIds.map(id => videos.find(v => v.id === id)).filter(Boolean);
  }

  private async getCollaborativeRecommendations(
    userId: number,
    limit: number,
    excludeWatched: boolean
  ): Promise<number[]> {
    if (!userId) {
      return this.getTrendingRecommendations(limit);
    }

    // Find users with similar viewing patterns
    const userWatchHistory = await this.getUserWatchHistory(userId);
    
    if (userWatchHistory.length === 0) {
      return this.getTrendingRecommendations(limit);
    }

    // Find other users who watched similar videos
    const similarUsers = await this.findSimilarUsers(userId, userWatchHistory, 50);

    // Get videos watched by similar users but not by current user
    const recommendations: VideoScore[] = [];
    
    for (const similarUser of similarUsers) {
      const theirHistory = await this.getUserWatchHistory(similarUser.userId);
      
      for (const videoId of theirHistory) {
        if (!userWatchHistory.includes(videoId)) {
          const existing = recommendations.find(r => r.videoId === videoId);
          if (existing) {
            existing.score += similarUser.similarity;
          } else {
            recommendations.push({
              videoId,
              score: similarUser.similarity,
              reason: 'Users with similar taste watched this',
            });
          }
        }
      }
    }

    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.videoId);
  }

  private async getContentBasedRecommendations(
    videoId: number,
    userId: number,
    limit: number,
    excludeWatched: boolean
  ): Promise<number[]> {
    if (!videoId) {
      return this.getPersonalizedRecommendations(userId, limit, excludeWatched);
    }

    const baseVideo = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['user'],
    });

    if (!baseVideo) {
      return this.getTrendingRecommendations(limit);
    }

    // Find videos with similar characteristics
    const recommendations: VideoScore[] = [];

    // 1. Same creator's other videos
    const creatorVideos = await this.videoRepository.find({
      where: { 
        userId: baseVideo.userId,
        isPublic: true,
      },
      take: limit * 2,
      order: { views: 'DESC' },
    });

    creatorVideos.forEach(video => {
      if (video.id !== videoId) {
        recommendations.push({
          videoId: video.id,
          score: 0.8,
          reason: `More from ${baseVideo.user.name}`,
        });
      }
    });

    // 2. Videos with similar titles (using simple text similarity)
    const titleWords = this.extractKeywords(baseVideo.title);
    if (titleWords.length > 0) {
      const similarTitleVideos = await this.videoRepository
        .createQueryBuilder('video')
        .where('video.isPublic = :isPublic', { isPublic: true })
        .andWhere('video.id != :videoId', { videoId })
        .andWhere('LOWER(video.title) SIMILAR TO :pattern', {
          pattern: `%(${titleWords.join('|')})%`,
        })
        .take(limit)
        .getMany();

      similarTitleVideos.forEach(video => {
        const titleSimilarity = this.calculateTextSimilarity(baseVideo.title, video.title);
        recommendations.push({
          videoId: video.id,
          score: titleSimilarity * 0.6,
          reason: 'Similar content',
        });
      });
    }

    // Remove duplicates and sort by score
    const uniqueRecommendations = recommendations
      .reduce((acc, curr) => {
        const existing = acc.find(r => r.videoId === curr.videoId);
        if (existing) {
          existing.score = Math.max(existing.score, curr.score);
        } else {
          acc.push(curr);
        }
        return acc;
      }, [] as VideoScore[])
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return uniqueRecommendations.map(r => r.videoId);
  }

  private async getTrendingRecommendations(limit: number): Promise<number[]> {
    // Get trending videos from last 24 hours
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const trending = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select(['videoId', 'COUNT(*) as score'])
      .where('timestamp >= :startDate', { startDate })
      .andWhere('eventType IN (:...events)', { events: ['view', 'like', 'share'] })
      .groupBy('videoId')
      .orderBy('score', 'DESC')
      .limit(limit)
      .getRawMany();

    return trending.map(t => parseInt(t.videoId));
  }

  private async getMixedRecommendations(
    userId: number,
    videoId: number,
    limit: number,
    excludeWatched: boolean
  ): Promise<number[]> {
    const recommendations: number[] = [];
    
    // 40% collaborative filtering
    if (userId) {
      const collaborative = await this.getCollaborativeRecommendations(
        userId, 
        Math.floor(limit * 0.4), 
        excludeWatched
      );
      recommendations.push(...collaborative);
    }

    // 30% content-based
    if (videoId) {
      const contentBased = await this.getContentBasedRecommendations(
        videoId,
        userId,
        Math.floor(limit * 0.3),
        excludeWatched
      );
      recommendations.push(...contentBased);
    }

    // 30% trending
    const trending = await this.getTrendingRecommendations(Math.floor(limit * 0.3));
    recommendations.push(...trending);

    // Remove duplicates and fill up to limit
    const unique = [...new Set(recommendations)];
    
    if (unique.length < limit) {
      // Fill with more trending if needed
      const moreTrending = await this.getTrendingRecommendations(limit - unique.length);
      unique.push(...moreTrending.filter(id => !unique.includes(id)));
    }

    return unique.slice(0, limit);
  }

  private async getPersonalizedRecommendations(
    userId: number,
    limit: number,
    excludeWatched: boolean
  ): Promise<number[]> {
    if (!userId) {
      return this.getTrendingRecommendations(limit);
    }

    // Get user's watch history and preferences
    const userHistory = await this.getUserWatchHistory(userId);
    const userPreferences = await this.analyzeUserPreferences(userId, userHistory);

    // Find videos matching user preferences
    let query = this.videoRepository
      .createQueryBuilder('video')
      .where('video.isPublic = :isPublic', { isPublic: true });

    if (excludeWatched && userHistory.length > 0) {
      query = query.andWhere('video.id NOT IN (:...watchedIds)', { watchedIds: userHistory });
    }

    // Apply preference filters
    if (userPreferences.preferredCreators.length > 0) {
      query = query.andWhere('video.userId IN (:...creators)', { 
        creators: userPreferences.preferredCreators 
      });
    }

    const personalizedVideos = await query
      .orderBy('video.views', 'DESC')
      .take(limit)
      .getMany();

    return personalizedVideos.map(v => v.id);
  }

  private async getUserWatchHistory(userId: number): Promise<number[]> {
    const cacheKey = `user_history:${userId}`;
    const cached = await this.cacheService.get<number[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const history = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('DISTINCT(videoId)')
      .where('userId = :userId', { userId })
      .andWhere('eventType = :eventType', { eventType: 'view' })
      .orderBy('timestamp', 'DESC')
      .limit(100)
      .getRawMany();

    const videoIds = history.map(h => parseInt(h.videoId)).filter(Boolean);
    
    // Cache for 1 hour
    await this.cacheService.set(cacheKey, videoIds, 3600);
    
    return videoIds;
  }

  private async findSimilarUsers(
    userId: number, 
    userHistory: number[], 
    limit: number
  ): Promise<{ userId: number; similarity: number }[]> {
    // Find users who have watched similar videos
    const similarUsers = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select(['userId', 'COUNT(*) as commonVideos'])
      .where('videoId IN (:...videoIds)', { videoIds: userHistory })
      .andWhere('userId != :userId', { userId })
      .andWhere('eventType = :eventType', { eventType: 'view' })
      .groupBy('userId')
      .having('COUNT(*) >= :minCommon', { minCommon: Math.min(3, userHistory.length * 0.1) })
      .orderBy('commonVideos', 'DESC')
      .limit(limit)
      .getRawMany();

    return similarUsers.map(user => ({
      userId: parseInt(user.userId),
      similarity: parseInt(user.commonVideos) / userHistory.length,
    }));
  }

  private async analyzeUserPreferences(userId: number, history: number[]): Promise<any> {
    if (history.length === 0) {
      return { preferredCreators: [], preferredCategories: [] };
    }

    // Find most watched creators
    const creatorStats = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .innerJoin('videos', 'video', 'video.id = analytics.videoId')
      .select(['video.userId as creatorId', 'COUNT(*) as watchCount'])
      .where('analytics.userId = :userId', { userId })
      .andWhere('analytics.eventType = :eventType', { eventType: 'view' })
      .groupBy('video.userId')
      .orderBy('watchCount', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      preferredCreators: creatorStats.map(c => parseInt(c.creatorId)),
      preferredCategories: [], // Would need category data
    };
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.includes(word))
      .slice(0, 5);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // ML-Enhanced Recommendations
  private async enhanceWithMLPredictions(videoIds: number[], userId?: number): Promise<number[]> {
    try {
      const videos = await this.videoRepository.find({
        where: { id: In(videoIds) },
        relations: ['user'],
      });

      const enhancedVideos = [];

      for (const video of videos) {
        // Convert video to features format for ML prediction
        const features = {
          videoId: video.id.toString(),
          titleLength: video.title.length,
          descriptionLength: video.description?.length || 0,
          tagCount: 0, // Would need to add tags field to video entity
          viewCount: video.views,
          likeCount: 0, // Would need to add from analytics
          commentCount: 0, // Would need to add from analytics
          durationMinutes: video.duration || 0,
          categoryId: '0', // Would need to add category field
          publishHour: video.createdAt.getHours(),
          publishDayOfWeek: video.createdAt.getDay(),
          titleSentiment: 0.5, // Would need sentiment analysis
          descriptionSentiment: 0.5,
          engagementRate: 0.05, // Default engagement rate
          viewsPerHour: this.calculateViewsPerHour(video),
          tagsPopularity: [],
        };

        try {
          const prediction = await this.mlTrainingService.predictVideoPerformance(features, 'viral_prediction');
          
          enhancedVideos.push({
            videoId: video.id,
            originalScore: 1, // Base score
            mlScore: prediction.predictedScore,
            confidence: prediction.confidence,
            combinedScore: prediction.predictedScore * prediction.confidence,
          });
        } catch (error) {
          // If ML prediction fails, keep original video with base score
          enhancedVideos.push({
            videoId: video.id,
            originalScore: 1,
            mlScore: 0.5,
            confidence: 0.5,
            combinedScore: 0.5,
          });
        }
      }

      // Sort by combined ML score and return video IDs
      return enhancedVideos
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .map(item => item.videoId);

    } catch (error) {
      this.logger.error('Error enhancing recommendations with ML:', error);
      return videoIds; // Return original order if ML enhancement fails
    }
  }

  private calculateViewsPerHour(video: any): number {
    const hoursOnline = Math.max(1, (Date.now() - video.createdAt.getTime()) / (1000 * 60 * 60));
    return video.views / hoursOnline;
  }

  // YouTube API Training Integration
  async trainRecommendationModel(): Promise<void> {
    if (!this.mlTrainingService) {
      throw new Error('ML Training Service not available');
    }

    this.logger.log('Starting recommendation model training with YouTube data');
    
    try {
      // Train all model types
      await this.mlTrainingService.trainRecommendationModel('viral_prediction', 5000);
      await this.mlTrainingService.trainRecommendationModel('engagement_prediction', 5000);
      await this.mlTrainingService.trainRecommendationModel('retention_prediction', 5000);
      
      this.logger.log('Recommendation model training completed');
    } catch (error) {
      this.logger.error('Error training recommendation models:', error);
      throw error;
    }
  }

  async getModelPerformance(): Promise<any> {
    if (!this.mlTrainingService) {
      return { error: 'ML Training Service not available' };
    }

    return await this.mlTrainingService.getModelStats();
  }
}