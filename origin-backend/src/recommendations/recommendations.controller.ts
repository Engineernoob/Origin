import { Controller, Get, Query, Req } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationsService) {}

  @Get()
  async getRecommendations(
    @Req() req,
    @Query('algorithm') algorithm?: string,
    @Query('videoId') videoId?: string,
    @Query('limit') limit?: string,
  ) {
    const options = {
      userId: req.user?.id,
      videoId: videoId ? parseInt(videoId) : undefined,
      limit: limit ? parseInt(limit, 10) : 20,
      algorithm: algorithm as any || 'mixed',
    };

    return this.recommendationService.getRecommendations(options);
  }

  @Get('trending')
  async getTrending(@Query('limit') limit: string = '20') {
    return this.recommendationService.getRecommendations({
      algorithm: 'trending',
      limit: parseInt(limit, 10),
    });
  }
}
