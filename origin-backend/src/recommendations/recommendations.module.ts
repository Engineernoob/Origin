import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationController } from './recommendations.controller';
import { YoutubeModule } from '../youtube/youtube.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [YoutubeModule, UsersModule],
  providers: [RecommendationsService],
  controllers: [RecommendationController],
})
export class RecommendationModule {}
