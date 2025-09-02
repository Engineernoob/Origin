import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YouTubeApiService, YouTubeVideo } from './youtube-api.service';
import { CacheService } from '../cache/cache.service';
import { TrainingData } from './training-data.entity';

export interface VideoFeatures {
  videoId: string;
  titleLength: number;
  descriptionLength: number;
  tagCount: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  durationMinutes: number;
  categoryId: string;
  publishHour: number;
  publishDayOfWeek: number;
  titleSentiment: number;
  descriptionSentiment: number;
  engagementRate: number;
  viewsPerHour: number;
  tagsPopularity: number[];
  channelSubscribers?: number;
  channelVideoCount?: number;
  thumbnailFeatures?: {
    dominantColor: string;
    faceDetection: boolean;
    textOverlay: boolean;
  };
}

export interface TrainingExample {
  features: VideoFeatures;
  labels: {
    viralScore: number; // 0-1 based on view velocity
    engagementScore: number; // 0-1 based on likes/comments ratio
    retentionScore: number; // Estimated from similar videos
    categoryPopularity: number; // 0-1 within category
  };
}

@Injectable()
export class TrainingDataService {
  private readonly logger = new Logger(TrainingDataService.name);

  constructor(
    @InjectRepository(TrainingData)
    private trainingRepository: Repository<TrainingData>,
    private youtubeApi: YouTubeApiService,
    private cacheService: CacheService,
  ) {}

  async collectTrainingData(categories: string[] = [], sampleSize = 1000): Promise<void> {
    this.logger.log(`Starting collection of ${sampleSize} training examples`);

    const queries = [
      'viral videos', 'trending content', 'popular music', 'tech reviews',
      'gaming highlights', 'cooking tutorial', 'fitness workout', 'comedy skits',
      'educational content', 'product reviews', 'travel vlogs', 'diy projects',
      'news analysis', 'movie trailers', 'science experiments', 'art tutorials'
    ];

    let collectedCount = 0;
    const targetPerQuery = Math.ceil(sampleSize / queries.length);

    for (const query of queries) {
      if (collectedCount >= sampleSize) break;

      try {
        await this.collectFromQuery(query, targetPerQuery);
        collectedCount += targetPerQuery;
        
        // Rate limiting - wait between queries
        await this.sleep(1000);
      } catch (error) {
        this.logger.error(`Error collecting data for query "${query}":`, error);
      }
    }

    // Also collect trending videos
    try {
      await this.collectTrendingVideos();
    } catch (error) {
      this.logger.error('Error collecting trending videos:', error);
    }

    this.logger.log(`Training data collection completed. Total examples: ${collectedCount}`);
  }

  private async collectFromQuery(query: string, maxResults: number): Promise<void> {
    let pageToken: string | undefined;
    let collected = 0;

    while (collected < maxResults) {
      try {
        const result = await this.youtubeApi.searchVideos(
          query,
          Math.min(50, maxResults - collected),
          pageToken
        );

        for (const video of result.videos) {
          const features = await this.extractFeatures(video);
          const labels = this.calculateLabels(video);
          
          const trainingExample: TrainingExample = { features, labels };
          await this.saveTrainingExample(trainingExample);
          collected++;
        }

        pageToken = result.nextPageToken;
        if (!pageToken) break;

        // Rate limiting
        await this.sleep(100);
      } catch (error) {
        this.logger.error(`Error in collectFromQuery for "${query}":`, error);
        break;
      }
    }
  }

  private async collectTrendingVideos(): Promise<void> {
    try {
      const trendingVideos = await this.youtubeApi.getTrendingVideos();
      
      for (const video of trendingVideos) {
        const features = await this.extractFeatures(video);
        const labels = this.calculateLabels(video, true); // Mark as trending
        
        const trainingExample: TrainingExample = { features, labels };
        await this.saveTrainingExample(trainingExample);
      }
    } catch (error) {
      this.logger.error('Error collecting trending videos:', error);
    }
  }

  private async extractFeatures(video: YouTubeVideo): Promise<VideoFeatures> {
    const publishDate = new Date(video.publishedAt);
    const duration = this.parseDuration(video.duration);
    
    // Calculate engagement rate
    const engagementRate = video.viewCount > 0 
      ? (video.likeCount + video.commentCount) / video.viewCount 
      : 0;

    // Calculate views per hour since publish
    const hoursOnline = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60);
    const viewsPerHour = hoursOnline > 0 ? video.viewCount / hoursOnline : 0;

    // Basic sentiment analysis (simplified)
    const titleSentiment = this.analyzeSentiment(video.title);
    const descriptionSentiment = this.analyzeSentiment(video.description);

    // Tag popularity analysis
    const tagsPopularity = await this.analyzeTagsPopularity(video.tags);

    return {
      videoId: video.id,
      titleLength: video.title.length,
      descriptionLength: video.description.length,
      tagCount: video.tags.length,
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      commentCount: video.commentCount,
      durationMinutes: duration,
      categoryId: video.categoryId,
      publishHour: publishDate.getHours(),
      publishDayOfWeek: publishDate.getDay(),
      titleSentiment,
      descriptionSentiment,
      engagementRate,
      viewsPerHour,
      tagsPopularity,
    };
  }

  private calculateLabels(video: YouTubeVideo, isTrending = false): any {
    // Viral score based on view velocity and absolute views
    const publishDate = new Date(video.publishedAt);
    const hoursOnline = Math.max(1, (Date.now() - publishDate.getTime()) / (1000 * 60 * 60));
    const viewVelocity = video.viewCount / hoursOnline;
    
    // Normalize viral score (this would be tuned based on your data)
    const viralScore = Math.min(1, viewVelocity / 10000) * (isTrending ? 1.5 : 1);

    // Engagement score
    const totalEngagements = video.likeCount + video.commentCount;
    const engagementScore = video.viewCount > 0 
      ? Math.min(1, totalEngagements / (video.viewCount * 0.1))
      : 0;

    // Retention score (estimated based on engagement patterns)
    const retentionScore = this.estimateRetentionScore(video);

    // Category popularity (would need more data to calculate accurately)
    const categoryPopularity = isTrending ? 0.8 : 0.5;

    return {
      viralScore: Math.min(1, viralScore),
      engagementScore: Math.min(1, engagementScore),
      retentionScore,
      categoryPopularity,
    };
  }

  private parseDuration(duration: string): number {
    // Parse ISO 8601 duration (PT4M13S) to minutes
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 60 + minutes + seconds / 60;
  }

  private analyzeSentiment(text: string): number {
    // Simplified sentiment analysis
    // In production, you'd use a proper NLP library like sentiment or TextBlob
    const positiveWords = ['amazing', 'awesome', 'great', 'best', 'love', 'fantastic', 'perfect'];
    const negativeWords = ['bad', 'worst', 'hate', 'terrible', 'awful', 'horrible', 'sucks'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    for (const word of words) {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    }
    
    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, score / words.length * 10));
  }

  private async analyzeTagsPopularity(tags: string[]): Promise<number[]> {
    // Analyze how popular each tag is based on cached data
    const popularityScores = [];
    
    for (const tag of tags) {
      const cacheKey = `tag_popularity:${tag.toLowerCase()}`;
      let popularity = await this.cacheService.get<number>(cacheKey);
      
      if (popularity === null) {
        // If not cached, assign a default and queue for analysis
        popularity = 0.5;
        // In a real implementation, you'd queue this tag for popularity analysis
      }
      
      popularityScores.push(popularity);
    }
    
    return popularityScores;
  }

  private estimateRetentionScore(video: YouTubeVideo): number {
    // Estimate retention based on engagement patterns and duration
    const duration = this.parseDuration(video.duration);
    const engagementRate = video.viewCount > 0 
      ? (video.likeCount + video.commentCount) / video.viewCount 
      : 0;

    // Generally, shorter videos have better retention, high engagement suggests good retention
    let retentionScore = 0.7; // Base score

    // Duration factor
    if (duration < 2) retentionScore += 0.2;
    else if (duration < 5) retentionScore += 0.1;
    else if (duration > 15) retentionScore -= 0.1;
    else if (duration > 30) retentionScore -= 0.2;

    // Engagement factor
    retentionScore += engagementRate * 0.3;

    return Math.max(0, Math.min(1, retentionScore));
  }

  private async saveTrainingExample(example: TrainingExample): Promise<void> {
    try {
      const existingData = await this.trainingRepository.findOne({
        where: { videoId: example.features.videoId },
      });

      if (existingData) {
        // Update existing data
        existingData.features = example.features;
        existingData.labels = example.labels;
        existingData.updatedAt = new Date();
        await this.trainingRepository.save(existingData);
      } else {
        // Create new training data
        const trainingData = this.trainingRepository.create({
          videoId: example.features.videoId,
          features: example.features,
          labels: example.labels,
          source: 'youtube_api',
        });
        await this.trainingRepository.save(trainingData);
      }
    } catch (error) {
      this.logger.error(`Error saving training example for video ${example.features.videoId}:`, error);
    }
  }

  async getTrainingDataset(limit = 10000): Promise<TrainingExample[]> {
    const trainingData = await this.trainingRepository.find({
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return trainingData.map(data => ({
      features: data.features,
      labels: data.labels,
    }));
  }

  async getTrainingStats(): Promise<any> {
    const total = await this.trainingRepository.count();
    const bySource = await this.trainingRepository
      .createQueryBuilder('training')
      .select('training.source, COUNT(*) as count')
      .groupBy('training.source')
      .getRawMany();

    const recent = await this.trainingRepository.count({
      where: {
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    });

    return {
      total,
      recent,
      bySource,
      quotaUsage: this.youtubeApi.getQuotaUsage(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}