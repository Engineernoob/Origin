import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { VideoProcessingService } from './video-processing.service';
import { VideoProcessingProcessor } from './video-processing.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'video-processing',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
  ],
  providers: [VideoProcessingService, VideoProcessingProcessor],
  exports: [VideoProcessingService],
})
export class VideoProcessingModule {}
