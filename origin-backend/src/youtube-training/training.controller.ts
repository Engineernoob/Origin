import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { YouTubeApiService } from './youtube-api.service';
import { TrainingDataService } from './training-data.service';
import { MLTrainingService } from './ml-training.service';

@Controller('training')
@UseGuards(JwtAuthGuard)
export class TrainingController {
  constructor(
    private youtubeApiService: YouTubeApiService,
    private trainingDataService: TrainingDataService,
    private mlTrainingService: MLTrainingService,
  ) {}

  @Post('collect-data')
  async collectTrainingData(
    @Query('categories') categories?: string,
    @Query('sampleSize') sampleSize?: string,
  ) {
    const categoriesArray = categories ? categories.split(',') : [];
    const size = sampleSize ? parseInt(sampleSize) : 1000;

    await this.trainingDataService.collectTrainingData(categoriesArray, size);

    return {
      message: 'Training data collection started',
      categories: categoriesArray,
      sampleSize: size,
    };
  }

  @Post('train-model')
  async trainModel(
    @Query('type') modelType?: string,
    @Query('size') trainingSize?: string,
  ) {
    const type =
      (modelType as
        | 'viral_prediction'
        | 'engagement_prediction'
        | 'retention_prediction') || 'viral_prediction';
    const size = trainingSize ? parseInt(trainingSize) : 5000;

    const model = await this.mlTrainingService.trainRecommendationModel(
      type,
      size,
    );

    return {
      message: 'Model training completed',
      modelId: model.modelId,
      accuracy: model.accuracy,
      trainingDate: model.trainingDate,
    };
  }

  @Post('retrain-all')
  async retrainAllModels() {
    await this.mlTrainingService.retrainAllModels();

    return {
      message: 'All models retrained successfully',
    };
  }

  @Get('stats')
  async getTrainingStats() {
    const [trainingStats, modelStats] = await Promise.all([
      this.trainingDataService.getTrainingStats(),
      this.mlTrainingService.getModelStats(),
    ]);

    return {
      training: trainingStats,
      models: modelStats,
      quotaUsage: this.youtubeApiService.getQuotaUsage(),
    };
  }

  @Get('trending')
  async getTrendingVideos(
    @Query('region') regionCode?: string,
    @Query('category') categoryId?: string,
  ) {
    const videos = await this.youtubeApiService.getTrendingVideos(
      regionCode,
      categoryId,
    );

    return {
      count: videos.length,
      videos: videos.slice(0, 10), // Return first 10 for preview
    };
  }

  @Get('search')
  async searchYouTubeVideos(
    @Query('q') query: string,
    @Query('maxResults') maxResults?: string,
  ) {
    if (!query) {
      return { error: 'Query parameter is required' };
    }

    const max = maxResults ? parseInt(maxResults) : 10;
    const result = await this.youtubeApiService.searchVideos(query, max);

    return {
      query,
      totalResults: result.totalResults,
      count: result.videos.length,
      videos: result.videos,
      nextPageToken: result.nextPageToken,
    };
  }

  @Get('categories')
  async getVideoCategories() {
    const categories = await this.youtubeApiService.getVideoCategories();

    return {
      categories,
      count: Object.keys(categories).length,
    };
  }
}
