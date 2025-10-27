import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createReadStream, statSync, existsSync } from 'fs';
import { join } from 'path';
import { Request, Response } from 'express';

@Injectable()
export class VideoStreamingService {
  private readonly logger = new Logger(VideoStreamingService.name);
  private readonly uploadPath = process.env.UPLOAD_PATH || './uploads';

  async streamVideo(
    videoId: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    const videoPath = join(this.uploadPath, `${videoId}.mp4`);

    if (!existsSync(videoPath)) {
      throw new NotFoundException('Video not found');
    }

    const stat = statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Handle range requests for video seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      const file = createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Stream entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      };

      res.writeHead(200, head);
      createReadStream(videoPath).pipe(res);
    }
  }

  async streamThumbnail(videoId: string, res: Response): Promise<void> {
    const thumbnailPath = join(this.uploadPath, `${videoId}-thumb.jpg`);

    if (!existsSync(thumbnailPath)) {
      throw new NotFoundException('Thumbnail not found');
    }

    const stat = statSync(thumbnailPath);
    const head = {
      'Content-Length': stat.size,
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000',
    };

    res.writeHead(200, head);
    createReadStream(thumbnailPath).pipe(res);
  }

  generateVideoManifest(
    videoId: string,
    qualities: string[] = ['360p', '720p', '1080p'],
  ) {
    // Generate HLS manifest for adaptive bitrate streaming
    const manifest = {
      version: 1,
      videoId,
      qualities: qualities.map((quality) => ({
        quality,
        url: `/api/videos/${videoId}/stream/${quality}`,
        bandwidth: this.getBandwidthForQuality(quality),
      })),
    };

    return manifest;
  }

  private getBandwidthForQuality(quality: string): number {
    const bandwidthMap = {
      '360p': 800000, // 800 kbps
      '720p': 2500000, // 2.5 Mbps
      '1080p': 5000000, // 5 Mbps
      '1440p': 10000000, // 10 Mbps
      '2160p': 25000000, // 25 Mbps
    };

    return bandwidthMap[quality] || 1000000;
  }
}
