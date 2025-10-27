import { Module } from '@nestjs/common';
import { YoutubeController } from '../youtube/youtube.controller';
import { YoutubeService } from '../youtube/youtube.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [YoutubeController],
  providers: [YoutubeService],
})
export class YoutubeModule {}
