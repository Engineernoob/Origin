import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { VideoProcessingService, VideoProcessingJob } from './video-processing.service';

@Processor('video-processing')
export class VideoProcessingProcessor {
  private readonly logger = new Logger(VideoProcessingProcessor.name);

  constructor(private readonly videoProcessingService: VideoProcessingService) {}

  @Process('process-video')
  async handleVideoProcessing(job: Job<VideoProcessingJob>) {
    this.logger.log(`Processing video job ${job.id} for video ${job.data.videoId}`);
    
    try {
      await this.videoProcessingService.processVideo(job.data);
      this.logger.log(`Completed video processing job ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed video processing job ${job.id}:`, error);
      throw error;
    }
  }
}