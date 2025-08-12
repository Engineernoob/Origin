import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Video } from './videos.entity';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video) private readonly repo: Repository<Video>,
  ) {}

  async create(dto: CreateVideoDto) {
    const v = this.repo.create({
      ...dto,
      isRebelContent: dto.isRebelContent ?? false,
      tags: dto.tags ?? [],
      creatorSubscribers: dto.creatorSubscribers ?? '0',
    });
    return this.repo.save(v);
  }

  async findOneOrThrow(id: number) {
    const v = await this.repo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('Video not found');
    return v;
  }

  async findMany(params: { q?: string; tag?: string; limit?: number }) {
    const { q, tag, limit = 24 } = params;
    const where: any = {};
    if (q) where.title = ILike(`%${q}%`);
    // if both used, we AND them; expand if you want OR logic
    if (tag) where.tags = ILike(`%${tag}%`);

    return this.repo.find({
      where,
      order: { uploadedAt: 'DESC' },
      take: Math.min(100, Math.max(1, limit)),
    });
  }

  async update(id: number, dto: UpdateVideoDto) {
    await this.repo.update(id, dto);
    return this.findOneOrThrow(id);
  }

  async remove(id: number) {
    await this.repo.delete(id);
    return { ok: true };
  }
}
