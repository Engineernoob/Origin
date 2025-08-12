import { Controller, Get, Param, ParseIntPipe, Query, Post, Body, Patch, Delete } from '@nestjs/common';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';

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
}