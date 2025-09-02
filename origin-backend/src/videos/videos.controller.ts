import { 
  Controller, 
  Get, 
  Param, 
  ParseIntPipe, 
  Query, 
  Post, 
  Body, 
  Patch, 
  Delete, 
  UseInterceptors, 
  UploadedFile, 
  UploadedFiles, 
  UseGuards,
  Req,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UploadService } from '../common/services/upload.service';

@Controller('videos')
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  // list/search for grid
  @Get()
  async list(
    @Query('q') q?: string,
    @Query('tag') tag?: string,
    @Query('limit') limit?: string,
  ) {
    const res = await this.videos.findMany({
      q,
      tag,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    // return as-is for grids
    return res;
  }

  // detail for player
  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const v = await this.videos.findOneOrThrow(id);

    // Map to your VideoPlayer props shape
    return {
      videoUrl: v.videoUrl,
      title: v.title,
      creator: {
        name: v.creatorName,
        avatar: v.creatorAvatar ?? undefined,
        subscribers: v.creatorSubscribers ?? '0',
        isVerified: v.creatorVerified ?? false,
      },
      views: v.views.toLocaleString(),
      likes: v.likes,
      dislikes: v.dislikes,
      uploadDate: v.uploadedAt.toDateString(),
      description: v.description ?? '',
      isRebelContent: v.isRebelContent,
      tags: v.tags ?? [],
    };
  }

  // admin/seed (protect later)
  @Post()
  async create(@Body() dto: CreateVideoDto) {
    return this.videos.create(dto);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVideoDto) {
    return this.videos.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.videos.remove(id);
  }

  // Upload video with metadata
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 2, {
      storage: UploadService.getVideoStorage(),
      fileFilter: (req, file, callback) => {
        if (file.fieldname === 'video') {
          return UploadService.videoFileFilter(req, file, callback);
        } else if (file.fieldname === 'thumbnail') {
          return UploadService.imageFileFilter(req, file, callback);
        }
        callback(new Error('Invalid field name'), false);
      },
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max for video
      },
    })
  )
  async uploadVideo(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() metadata: { title: string; description?: string; tags?: string; isRebelContent?: string },
    @Req() req: any
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const videoFile = files.find(f => f.fieldname === 'video');
    const thumbnailFile = files.find(f => f.fieldname === 'thumbnail');

    if (!videoFile) {
      throw new BadRequestException('Video file is required');
    }

    const user = req.user; // From JWT guard

    // Create video entry
    const createDto: CreateVideoDto = {
      title: metadata.title,
      description: metadata.description || '',
      creatorName: user.name,
      creatorAvatar: user.picture || null,
      creatorVerified: false,
      videoUrl: `/uploads/videos/${videoFile.filename}`,
      thumbnailUrl: thumbnailFile ? `/uploads/thumbnails/${thumbnailFile.filename}` : null,
      tags: metadata.tags ? metadata.tags.split(',').map(t => t.trim()) : [],
      isRebelContent: metadata.isRebelContent === 'true',
    };

    return this.videos.create(createDto);
  }
}