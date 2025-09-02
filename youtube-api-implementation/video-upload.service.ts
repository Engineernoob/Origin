import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as multer from 'multer';
import * as path from 'path';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface VideoUploadResult {
  videoId: string;
  uploadUrl?: string;
  directUpload?: boolean;
  uploadToken: string;
  expiresAt: Date;
  maxFileSize: number;
  allowedFormats: string[];
}

export interface VideoMetadata {
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacy: 'public' | 'unlisted' | 'private';
  thumbnail?: string;
  language?: string;
  license?: string;
  recordingDate?: Date;
  location?: {
    latitude: number;
    longitude: number;
    locationDescription?: string;
  };
}

@Injectable()
export class VideoUploadService {
  private readonly logger = new Logger(VideoUploadService.name);
  private s3: S3;
  
  // Supported video formats (like YouTube)
  private readonly SUPPORTED_FORMATS = [
    '.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv', 
    '.m4v', '.3gp', '.3g2', '.mts', '.m2ts', '.divx', '.xvid'
  ];

  // Maximum file sizes (in bytes)
  private readonly MAX_FILE_SIZES = {
    standard: 128 * 1024 * 1024 * 1024, // 128GB like YouTube
    verified: 256 * 1024 * 1024 * 1024, // 256GB for verified channels
  };

  constructor(
    private configService: ConfigService,
    @InjectQueue('video-processing') private processingQueue: Queue,
  ) {
    this.s3 = new S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
  }

  async initiateVideoUpload(
    userId: number,
    metadata: VideoMetadata,
    fileSize: number,
    fileName: string,
  ): Promise<VideoUploadResult> {
    // 1. Validate file format
    const fileExtension = path.extname(fileName.toLowerCase());
    if (!this.SUPPORTED_FORMATS.includes(fileExtension)) {
      throw new BadRequestException(`Unsupported file format: ${fileExtension}`);
    }

    // 2. Check file size limits
    const userTier = await this.getUserTier(userId);
    const maxSize = this.MAX_FILE_SIZES[userTier];
    
    if (fileSize > maxSize) {
      throw new BadRequestException(
        `File size exceeds limit. Max: ${maxSize / (1024 * 1024 * 1024)}GB`
      );
    }

    // 3. Generate unique video ID and upload token
    const videoId = uuidv4();
    const uploadToken = uuidv4();
    
    // 4. Determine upload strategy
    const useDirectUpload = fileSize < 100 * 1024 * 1024; // 100MB threshold
    
    if (useDirectUpload) {
      // Direct upload for smaller files
      return {
        videoId,
        directUpload: true,
        uploadToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        maxFileSize: maxSize,
        allowedFormats: this.SUPPORTED_FORMATS,
      };
    } else {
      // Presigned URL for large files (resumable uploads)
      const uploadUrl = await this.generatePresignedUploadUrl(videoId, fileName);
      
      return {
        videoId,
        uploadUrl,
        directUpload: false,
        uploadToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        maxFileSize: maxSize,
        allowedFormats: this.SUPPORTED_FORMATS,
      };
    }
  }

  async handleDirectUpload(
    videoId: string,
    file: Express.Multer.File,
    metadata: VideoMetadata,
    userId: number,
  ): Promise<void> {
    try {
      // 1. Upload to S3
      const s3Key = `videos/raw/${videoId}/${file.originalname}`;
      
      const uploadResult = await this.s3.upload({
        Bucket: this.configService.get('S3_VIDEOS_BUCKET'),
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
        Metadata: {
          userId: userId.toString(),
          originalName: file.originalname,
          uploadDate: new Date().toISOString(),
        },
      }).promise();

      // 2. Store video metadata in database
      await this.storeVideoMetadata(videoId, {
        ...metadata,
        userId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        s3Location: uploadResult.Location,
        s3Key,
        status: 'uploaded',
        uploadedAt: new Date(),
      });

      // 3. Queue for processing
      await this.queueVideoProcessing(videoId, s3Key, metadata);

      this.logger.log(`Video uploaded successfully: ${videoId}`);
      
    } catch (error) {
      this.logger.error(`Upload failed for video ${videoId}:`, error);
      throw error;
    }
  }

  async handleResumableUpload(
    videoId: string,
    uploadToken: string,
    metadata: VideoMetadata,
    userId: number,
  ): Promise<void> {
    try {
      // 1. Check if multipart upload is complete
      const s3Key = `videos/raw/${videoId}/video`;
      
      // This would be called after all parts are uploaded
      const uploadResult = await this.s3.completeMultipartUpload({
        Bucket: this.configService.get('S3_VIDEOS_BUCKET'),
        Key: s3Key,
        UploadId: uploadToken, // In real implementation, you'd track this
        MultipartUpload: {
          Parts: [], // Parts would be tracked during upload
        },
      }).promise();

      // 2. Store metadata
      await this.storeVideoMetadata(videoId, {
        ...metadata,
        userId,
        s3Location: uploadResult.Location,
        s3Key,
        status: 'uploaded',
        uploadedAt: new Date(),
      });

      // 3. Queue for processing
      await this.queueVideoProcessing(videoId, s3Key, metadata);
      
    } catch (error) {
      this.logger.error(`Resumable upload completion failed: ${videoId}`, error);
      throw error;
    }
  }

  private async generatePresignedUploadUrl(
    videoId: string,
    fileName: string,
  ): Promise<string> {
    const s3Key = `videos/raw/${videoId}/${fileName}`;
    
    const signedUrl = await this.s3.getSignedUrlPromise('putObject', {
      Bucket: this.configService.get('S3_VIDEOS_BUCKET'),
      Key: s3Key,
      Expires: 24 * 60 * 60, // 24 hours
      ContentType: 'video/*',
      ServerSideEncryption: 'AES256',
    });

    return signedUrl;
  }

  private async storeVideoMetadata(
    videoId: string,
    data: any,
  ): Promise<void> {
    // Store in your database (PostgreSQL, MongoDB, etc.)
    // This would use your ORM (TypeORM, Mongoose, etc.)
    
    const videoRecord = {
      id: videoId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // await this.videoRepository.save(videoRecord);
    this.logger.log(`Video metadata stored: ${videoId}`);
  }

  private async queueVideoProcessing(
    videoId: string,
    s3Key: string,
    metadata: VideoMetadata,
  ): Promise<void> {
    await this.processingQueue.add('process-video', {
      videoId,
      s3Key,
      metadata,
      priority: metadata.privacy === 'public' ? 'high' : 'normal',
    }, {
      priority: metadata.privacy === 'public' ? 10 : 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
    });

    this.logger.log(`Video queued for processing: ${videoId}`);
  }

  private async getUserTier(userId: number): Promise<'standard' | 'verified'> {
    // Check user's verification status, subscriber count, etc.
    // For now, return standard
    return 'standard';
  }

  // YouTube-style upload progress tracking
  async getUploadProgress(videoId: string, uploadToken: string): Promise<{
    progress: number;
    status: string;
    bytesUploaded: number;
    totalBytes: number;
  }> {
    // Track upload progress for resumable uploads
    // This would query S3 multipart upload status
    return {
      progress: 0,
      status: 'uploading',
      bytesUploaded: 0,
      totalBytes: 0,
    };
  }

  // Handle upload cancellation
  async cancelUpload(videoId: string, uploadToken: string): Promise<void> {
    try {
      // Cancel multipart upload if in progress
      await this.s3.abortMultipartUpload({
        Bucket: this.configService.get('S3_VIDEOS_BUCKET'),
        Key: `videos/raw/${videoId}/video`,
        UploadId: uploadToken,
      }).promise();

      // Clean up any partial data
      await this.cleanupPartialUpload(videoId);
      
      this.logger.log(`Upload cancelled: ${videoId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel upload ${videoId}:`, error);
    }
  }

  private async cleanupPartialUpload(videoId: string): Promise<void> {
    // Remove any partially uploaded files and database records
    const s3Prefix = `videos/raw/${videoId}/`;
    
    const objects = await this.s3.listObjectsV2({
      Bucket: this.configService.get('S3_VIDEOS_BUCKET'),
      Prefix: s3Prefix,
    }).promise();

    if (objects.Contents && objects.Contents.length > 0) {
      await this.s3.deleteObjects({
        Bucket: this.configService.get('S3_VIDEOS_BUCKET'),
        Delete: {
          Objects: objects.Contents.map(obj => ({ Key: obj.Key! })),
        },
      }).promise();
    }
  }
}