import { Controller, Get, Req } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationsService) {}

  @Get()
  async getRecommendations(@Req() req) {
    return this.recommendationService.getRecommendations(req.user.id);
  }
}
