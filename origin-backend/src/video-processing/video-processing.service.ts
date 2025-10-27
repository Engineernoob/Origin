import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from 'ffmpeg-static';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

ffmpeg.setFfmpegPath(ffmpegPath);

export interface VideoProcessingJob {
  videoId: string;
  inputPath: string;
  userId: number;
}

@Injectable()
export class VideoProcessingService {
  private readonly logger = new Logger(VideoProcessingService.name);
  private readonly uploadPath = process.env.UPLOAD_PATH || './uploads';
  private readonly outputPath = join(this.uploadPath, 'processed');

  constructor(@InjectQueue('video-processing') private videoQueue: Queue) {
    // Ensure output directory exists
    if (!existsSync(this.outputPath)) {
      mkdirSync(this.outputPath, { recursive: true });
    }
  }

  async queueVideoProcessing(job: VideoProcessingJob): Promise<void> {
    await this.videoQueue.add('process-video', job, {
      priority: 10,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    this.logger.log(`Queued video processing for video ${job.videoId}`);
  }

  async processVideo(job: VideoProcessingJob): Promise<void> {
    const { videoId, inputPath } = job;

    try {
      // Generate different quality versions
      await Promise.all([
        this.generateQuality(videoId, inputPath, '360p'),
        this.generateQuality(videoId, inputPath, '720p'),
        this.generateQuality(videoId, inputPath, '1080p'),
        this.generateThumbnail(videoId, inputPath),
        this.extractVideoMetadata(videoId, inputPath),
      ]);

      this.logger.log(`Successfully processed video ${videoId}`);
    } catch (error) {
      this.logger.error(`Failed to process video ${videoId}:`, error);
      throw error;
    }
  }

  private async generateQuality(
    videoId: string,
    inputPath: string,
    quality: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const outputPath = join(this.outputPath, `${videoId}-${quality}.mp4`);
      const { width, height, videoBitrate, audioBitrate } =
        this.getQualitySettings(quality);

      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size(`${width}x${height}`)
        .videoBitrate(videoBitrate)
        .audioBitrate(audioBitrate)
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-profile:v baseline',
          '-level 3.0',
          '-pix_fmt yuv420p',
          '-movflags +faststart',
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          this.logger.log(
            `FFmpeg process started for ${quality}: ${commandLine}`,
          );
        })
        .on('progress', (progress) => {
          this.logger.log(
            `Processing ${quality}: ${Math.round(progress.percent || 0)}% done`,
          );
        })
        .on('end', () => {
          this.logger.log(`Generated ${quality} version for video ${videoId}`);
          resolve();
        })
        .on('error', (err) => {
          this.logger.error(`Error generating ${quality} version:`, err);
          reject(err);
        })
        .run();
    });
  }

  private async generateThumbnail(
    videoId: string,
    inputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const thumbnailPath = join(this.uploadPath, `${videoId}-thumb.jpg`);

      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['10%'],
          filename: `${videoId}-thumb.jpg`,
          folder: this.uploadPath,
          size: '1280x720',
        })
        .on('end', () => {
          this.logger.log(`Generated thumbnail for video ${videoId}`);
          resolve();
        })
        .on('error', (err) => {
          this.logger.error(`Error generating thumbnail:`, err);
          reject(err);
        });
    });
  }

  private async extractVideoMetadata(
    videoId: string,
    inputPath: string,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          this.logger.error(`Error extracting metadata:`, err);
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === 'video',
        );
        const audioStream = metadata.streams.find(
          (stream) => stream.codec_type === 'audio',
        );

        const videoMetadata = {
          duration: metadata.format.duration,
          bitrate: metadata.format.bit_rate,
          size: metadata.format.size,
          video: videoStream
            ? {
                width: videoStream.width,
                height: videoStream.height,
                codec: videoStream.codec_name,
                fps: eval(videoStream.r_frame_rate), // Convert fraction to decimal
              }
            : null,
          audio: audioStream
            ? {
                codec: audioStream.codec_name,
                sampleRate: audioStream.sample_rate,
                channels: audioStream.channels,
              }
            : null,
        };

        this.logger.log(
          `Extracted metadata for video ${videoId}:`,
          videoMetadata,
        );
        resolve(videoMetadata);
      });
    });
  }

  private getQualitySettings(quality: string) {
    const settings = {
      '360p': {
        width: 640,
        height: 360,
        videoBitrate: '800k',
        audioBitrate: '128k',
      },
      '720p': {
        width: 1280,
        height: 720,
        videoBitrate: '2500k',
        audioBitrate: '128k',
      },
      '1080p': {
        width: 1920,
        height: 1080,
        videoBitrate: '5000k',
        audioBitrate: '256k',
      },
      '1440p': {
        width: 2560,
        height: 1440,
        videoBitrate: '10000k',
        audioBitrate: '256k',
      },
      '2160p': {
        width: 3840,
        height: 2160,
        videoBitrate: '25000k',
        audioBitrate: '320k',
      },
    };

    return settings[quality] || settings['720p'];
  }
}
