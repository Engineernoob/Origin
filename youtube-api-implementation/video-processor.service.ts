import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from 'ffmpeg-static';
import { S3 } from 'aws-sdk';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// YouTube-like quality presets
const QUALITY_PRESETS = {
  '144p': {
    width: 256,
    height: 144,
    videoBitrate: '80k',
    audioBitrate: '64k',
    fps: 15,
  },
  '240p': {
    width: 426,
    height: 240,
    videoBitrate: '150k',
    audioBitrate: '64k',
    fps: 24,
  },
  '360p': {
    width: 640,
    height: 360,
    videoBitrate: '400k',
    audioBitrate: '128k',
    fps: 24,
  },
  '480p': {
    width: 854,
    height: 480,
    videoBitrate: '750k',
    audioBitrate: '128k',
    fps: 24,
  },
  '720p': {
    width: 1280,
    height: 720,
    videoBitrate: '1500k',
    audioBitrate: '192k',
    fps: 30,
  },
  '1080p': {
    width: 1920,
    height: 1080,
    videoBitrate: '3000k',
    audioBitrate: '256k',
    fps: 30,
  },
  '1440p': {
    width: 2560,
    height: 1440,
    videoBitrate: '6000k',
    audioBitrate: '256k',
    fps: 30,
  },
  '2160p': {
    width: 3840,
    height: 2160,
    videoBitrate: '12000k',
    audioBitrate: '320k',
    fps: 30,
  },
};

export interface VideoProcessingJob {
  videoId: string;
  s3Key: string;
  metadata: any;
  priority: 'high' | 'normal' | 'low';
}

export interface ProcessingProgress {
  videoId: string;
  stage: string;
  progress: number;
  qualitiesCompleted: string[];
  totalQualities: number;
  estimatedTimeRemaining: number;
  error?: string;
}

@Injectable()
@Processor('video-processing')
export class VideoProcessorService {
  private readonly logger = new Logger(VideoProcessorService.name);
  private s3: S3;

  constructor(
    private configService: ConfigService,
    @InjectQueue('video-processing') private processingQueue: Queue,
  ) {
    ffmpeg.setFfmpegPath(ffmpegPath);
    
    this.s3 = new S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
  }

  @Process('process-video')
  async processVideo(job: Job<VideoProcessingJob>): Promise<void> {
    const { videoId, s3Key, metadata, priority } = job.data;
    
    this.logger.log(`Starting video processing: ${videoId}`);
    
    try {
      // 1. Download video from S3
      await this.updateProgress(videoId, 'downloading', 5);
      const localPath = await this.downloadVideoFromS3(s3Key, videoId);
      
      // 2. Extract video information
      await this.updateProgress(videoId, 'analyzing', 10);
      const videoInfo = await this.extractVideoInfo(localPath);
      
      // 3. Generate thumbnails
      await this.updateProgress(videoId, 'thumbnails', 15);
      await this.generateThumbnails(localPath, videoId, videoInfo);
      
      // 4. Determine optimal qualities based on source
      const targetQualities = this.determineTargetQualities(videoInfo);
      
      // 5. Transcode to multiple qualities
      await this.updateProgress(videoId, 'transcoding', 20);
      const transcodedVideos = await this.transcodeToQualities(
        localPath, 
        videoId, 
        targetQualities,
        job
      );
      
      // 6. Generate HLS and DASH manifests
      await this.updateProgress(videoId, 'manifests', 85);
      await this.generateStreamingManifests(videoId, transcodedVideos);
      
      // 7. Upload processed files to CDN
      await this.updateProgress(videoId, 'uploading', 90);
      await this.uploadProcessedFiles(videoId, transcodedVideos);
      
      // 8. Update database with processed video info
      await this.updateProgress(videoId, 'finalizing', 95);
      await this.finalizeVideoProcessing(videoId, videoInfo, transcodedVideos);
      
      // 9. Clean up local files
      await this.cleanupLocalFiles(localPath, videoId);
      
      await this.updateProgress(videoId, 'completed', 100);
      this.logger.log(`Video processing completed: ${videoId}`);
      
    } catch (error) {
      this.logger.error(`Video processing failed: ${videoId}`, error);
      await this.updateProgress(videoId, 'failed', 0, error.message);
      throw error;
    }
  }

  private async downloadVideoFromS3(s3Key: string, videoId: string): Promise<string> {
    const tempDir = path.join(os.tmpdir(), 'video-processing', videoId);
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    const localPath = path.join(tempDir, 'original.mp4');
    const writeStream = fs.createWriteStream(localPath);
    
    const s3Stream = this.s3.getObject({
      Bucket: this.configService.get('S3_VIDEOS_BUCKET'),
      Key: s3Key,
    }).createReadStream();
    
    return new Promise((resolve, reject) => {
      s3Stream.pipe(writeStream);
      writeStream.on('finish', () => resolve(localPath));
      writeStream.on('error', reject);
    });
  }

  private async extractVideoInfo(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        
        resolve({
          duration: metadata.format.duration,
          bitrate: metadata.format.bit_rate,
          size: metadata.format.size,
          video: {
            width: videoStream?.width,
            height: videoStream?.height,
            codec: videoStream?.codec_name,
            fps: eval(videoStream?.r_frame_rate || '30/1'),
            bitrate: videoStream?.bit_rate,
          },
          audio: {
            codec: audioStream?.codec_name,
            sampleRate: audioStream?.sample_rate,
            channels: audioStream?.channels,
            bitrate: audioStream?.bit_rate,
          },
        });
      });
    });
  }

  private async generateThumbnails(
    filePath: string, 
    videoId: string, 
    videoInfo: any
  ): Promise<void> {
    const thumbnailDir = path.join(os.tmpdir(), 'video-processing', videoId, 'thumbnails');
    await fs.promises.mkdir(thumbnailDir, { recursive: true });
    
    // Generate thumbnails at different time points (like YouTube)
    const duration = videoInfo.duration;
    const thumbnailTimes = [
      '10%',
      '25%',
      '50%',
      '75%',
      '90%',
    ];
    
    const thumbnailPromises = thumbnailTimes.map((time, index) => {
      return new Promise<void>((resolve, reject) => {
        ffmpeg(filePath)
          .screenshots({
            timestamps: [time],
            filename: `thumb-${index + 1}.jpg`,
            folder: thumbnailDir,
            size: '1280x720',
          })
          .on('end', resolve)
          .on('error', reject);
      });
    });
    
    await Promise.all(thumbnailPromises);
    
    // Upload thumbnails to S3
    const thumbnailFiles = await fs.promises.readdir(thumbnailDir);
    for (const file of thumbnailFiles) {
      const filePath = path.join(thumbnailDir, file);
      const fileBuffer = await fs.promises.readFile(filePath);
      
      await this.s3.upload({
        Bucket: this.configService.get('S3_CDN_BUCKET'),
        Key: `videos/${videoId}/thumbnails/${file}`,
        Body: fileBuffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000',
      }).promise();
    }
  }

  private determineTargetQualities(videoInfo: any): string[] {
    const sourceHeight = videoInfo.video.height;
    const availableQualities = Object.keys(QUALITY_PRESETS);
    
    // Only transcode to qualities that make sense for the source
    return availableQualities.filter(quality => {
      const preset = QUALITY_PRESETS[quality];
      return preset.height <= sourceHeight;
    });
  }

  private async transcodeToQualities(
    inputPath: string,
    videoId: string,
    qualities: string[],
    job: Job
  ): Promise<{ [quality: string]: string }> {
    const outputDir = path.join(os.tmpdir(), 'video-processing', videoId, 'transcoded');
    await fs.promises.mkdir(outputDir, { recursive: true });
    
    const transcodedFiles: { [quality: string]: string } = {};
    
    // Process qualities in parallel (but limit concurrency)
    const concurrency = Math.min(qualities.length, 3); // Limit to 3 concurrent transcodes
    const qualityChunks = this.chunkArray(qualities, concurrency);
    
    let completedQualities = 0;
    
    for (const chunk of qualityChunks) {
      const promises = chunk.map(async (quality) => {
        const preset = QUALITY_PRESETS[quality];
        const outputPath = path.join(outputDir, `${quality}.mp4`);
        
        await new Promise<void>((resolve, reject) => {
          const command = ffmpeg(inputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .size(`${preset.width}x${preset.height}`)
            .videoBitrate(preset.videoBitrate)
            .audioBitrate(preset.audioBitrate)
            .fps(preset.fps)
            .outputOptions([
              '-preset fast',
              '-crf 23',
              '-profile:v baseline',
              '-level 3.0',
              '-pix_fmt yuv420p',
              '-movflags +faststart',
              '-hls_time 6',
              '-hls_list_size 0',
              '-hls_segment_filename', path.join(outputDir, `${quality}_%03d.ts`),
            ])
            .output(outputPath);

          command.on('progress', (progress) => {
            // Update job progress
            const overallProgress = 20 + ((completedQualities + progress.percent / 100) / qualities.length) * 65;
            job.progress(Math.round(overallProgress));
          });

          command.on('end', () => {
            completedQualities++;
            resolve();
          });

          command.on('error', reject);
          command.run();
        });
        
        transcodedFiles[quality] = outputPath;
        
        this.logger.log(`Transcoded ${quality} for video ${videoId}`);
      });
      
      await Promise.all(promises);
    }
    
    return transcodedFiles;
  }

  private async generateStreamingManifests(
    videoId: string,
    transcodedVideos: { [quality: string]: string }
  ): Promise<void> {
    const manifestDir = path.join(os.tmpdir(), 'video-processing', videoId, 'manifests');
    await fs.promises.mkdir(manifestDir, { recursive: true });
    
    // Generate HLS master playlist
    const hlsManifest = this.generateHLSMasterPlaylist(Object.keys(transcodedVideos));
    await fs.promises.writeFile(
      path.join(manifestDir, 'master.m3u8'),
      hlsManifest
    );
    
    // Generate DASH manifest
    const dashManifest = this.generateDASHManifest(Object.keys(transcodedVideos));
    await fs.promises.writeFile(
      path.join(manifestDir, 'manifest.mpd'),
      dashManifest
    );
  }

  private generateHLSMasterPlaylist(qualities: string[]): string {
    let manifest = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
    
    qualities.forEach(quality => {
      const preset = QUALITY_PRESETS[quality];
      const bandwidth = parseInt(preset.videoBitrate) * 1000 + parseInt(preset.audioBitrate) * 1000;
      
      manifest += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${preset.width}x${preset.height}\n`;
      manifest += `${quality}.m3u8\n\n`;
    });
    
    return manifest;
  }

  private generateDASHManifest(qualities: string[]): string {
    // Generate DASH MPD manifest (simplified)
    // In production, you'd use a proper DASH library
    return `<?xml version="1.0"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" profiles="urn:mpeg:dash:profile:isoff-live:2011">
  <!-- DASH manifest content -->
</MPD>`;
  }

  private async uploadProcessedFiles(
    videoId: string,
    transcodedVideos: { [quality: string]: string }
  ): Promise<void> {
    const uploadPromises: Promise<any>[] = [];
    
    // Upload transcoded videos
    for (const [quality, filePath] of Object.entries(transcodedVideos)) {
      const fileStream = fs.createReadStream(filePath);
      
      uploadPromises.push(
        this.s3.upload({
          Bucket: this.configService.get('S3_CDN_BUCKET'),
          Key: `videos/${videoId}/${quality}.mp4`,
          Body: fileStream,
          ContentType: 'video/mp4',
          CacheControl: 'public, max-age=31536000',
        }).promise()
      );
    }
    
    // Upload manifests
    const manifestDir = path.join(os.tmpdir(), 'video-processing', videoId, 'manifests');
    const manifestFiles = await fs.promises.readdir(manifestDir);
    
    for (const file of manifestFiles) {
      const filePath = path.join(manifestDir, file);
      const fileBuffer = await fs.promises.readFile(filePath);
      const contentType = file.endsWith('.m3u8') ? 'application/x-mpegURL' : 'application/dash+xml';
      
      uploadPromises.push(
        this.s3.upload({
          Bucket: this.configService.get('S3_CDN_BUCKET'),
          Key: `videos/${videoId}/manifests/${file}`,
          Body: fileBuffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=300', // 5 minutes for manifests
        }).promise()
      );
    }
    
    await Promise.all(uploadPromises);
  }

  private async finalizeVideoProcessing(
    videoId: string,
    videoInfo: any,
    transcodedVideos: { [quality: string]: string }
  ): Promise<void> {
    // Update database with processing results
    const processingResults = {
      status: 'processed',
      duration: videoInfo.duration,
      availableQualities: Object.keys(transcodedVideos),
      videoCodec: 'h264',
      audioCodec: 'aac',
      processedAt: new Date(),
      fileSize: videoInfo.size,
      bitrate: videoInfo.bitrate,
      resolution: {
        width: videoInfo.video.width,
        height: videoInfo.video.height,
      },
    };
    
    // Update video record in database
    // await this.videoRepository.update(videoId, processingResults);
    
    this.logger.log(`Video finalized: ${videoId}`);
  }

  private async updateProgress(
    videoId: string,
    stage: string,
    progress: number,
    error?: string
  ): Promise<void> {
    const progressData: ProcessingProgress = {
      videoId,
      stage,
      progress,
      qualitiesCompleted: [],
      totalQualities: 0,
      estimatedTimeRemaining: 0,
      error,
    };
    
    // Store progress in Redis for real-time updates
    // await this.cacheService.set(`processing:${videoId}`, progressData, 3600);
    
    // Emit progress via WebSocket
    // this.eventGateway.emit(`video:processing:${videoId}`, progressData);
  }

  private async cleanupLocalFiles(originalPath: string, videoId: string): Promise<void> {
    const processingDir = path.join(os.tmpdir(), 'video-processing', videoId);
    
    try {
      await fs.promises.rm(processingDir, { recursive: true, force: true });
    } catch (error) {
      this.logger.warn(`Failed to cleanup files for ${videoId}:`, error);
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Public method to get processing status
  async getProcessingStatus(videoId: string): Promise<ProcessingProgress | null> {
    // Get from Redis cache
    // return await this.cacheService.get(`processing:${videoId}`);
    return null;
  }
}