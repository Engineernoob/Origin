import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comments.entity';
import { CacheService } from '../cache/cache.service';

export interface CreateCommentDto {
  content: string;
  videoId: number;
  parentId?: number;
}

export interface UpdateCommentDto {
  content: string;
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    private cacheService: CacheService,
  ) {}

  async create(
    userId: number,
    createCommentDto: CreateCommentDto,
  ): Promise<Comment> {
    const comment = this.commentsRepository.create({
      ...createCommentDto,
      userId,
    });

    const savedComment = await this.commentsRepository.save(comment);

    // Invalidate video comments cache
    await this.cacheService.invalidatePattern(
      `comments:video:${createCommentDto.videoId}:*`,
    );

    // Load the comment with user relationship
    return this.commentsRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user'],
    });
  }

  async findByVideoId(
    videoId: number,
    page = 1,
    limit = 20,
    userId?: number,
  ): Promise<{ comments: Comment[]; total: number; hasMore: boolean }> {
    const cacheKey = `comments:video:${videoId}:page:${page}:limit:${limit}`;

    // Try to get from cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const skip = (page - 1) * limit;

    // Get top-level comments
    const [comments, total] = await this.commentsRepository.findAndCount({
      where: {
        videoId,
        parentId: null, // Only top-level comments
        isDeleted: false,
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Load replies for each comment (first 3 replies)
    for (const comment of comments) {
      const replies = await this.commentsRepository.find({
        where: { parentId: comment.id, isDeleted: false },
        relations: ['user'],
        order: { createdAt: 'ASC' },
        take: 3,
      });

      const repliesCount = await this.commentsRepository.count({
        where: { parentId: comment.id, isDeleted: false },
      });

      comment.replies = replies;
      comment.repliesCount = repliesCount;

      // Check if user liked this comment (if userId provided)
      if (userId) {
        comment.isLikedByUser = await this.checkUserLiked(comment.id, userId);
      }
    }

    const result = {
      comments,
      total,
      hasMore: skip + limit < total,
    };

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, result, 300);

    return result;
  }

  async findReplies(
    parentId: number,
    page = 1,
    limit = 10,
    userId?: number,
  ): Promise<{ replies: Comment[]; total: number; hasMore: boolean }> {
    const skip = (page - 1) * limit;

    const [replies, total] = await this.commentsRepository.findAndCount({
      where: { parentId, isDeleted: false },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      skip,
      take: limit,
    });

    // Check like status for each reply
    if (userId) {
      for (const reply of replies) {
        reply.isLikedByUser = await this.checkUserLiked(reply.id, userId);
      }
    }

    return {
      replies,
      total,
      hasMore: skip + limit < total,
    };
  }

  async update(
    id: number,
    userId: number,
    updateCommentDto: UpdateCommentDto,
  ): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = updateCommentDto.content;
    comment.isEdited = true;

    const updatedComment = await this.commentsRepository.save(comment);

    // Invalidate cache
    await this.cacheService.invalidatePattern(
      `comments:video:${comment.videoId}:*`,
    );

    return updatedComment;
  }

  async remove(id: number, userId: number): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Soft delete
    comment.isDeleted = true;
    comment.content = '[deleted]';

    await this.commentsRepository.save(comment);

    // Invalidate cache
    await this.cacheService.invalidatePattern(
      `comments:video:${comment.videoId}:*`,
    );
  }

  async toggleLike(
    commentId: number,
    userId: number,
  ): Promise<{ liked: boolean; likesCount: number }> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const likeKey = `comment:like:${commentId}:${userId}`;
    const hasLiked = await this.cacheService.get(likeKey);

    if (hasLiked) {
      // Unlike
      comment.likes = Math.max(0, comment.likes - 1);
      await this.cacheService.del(likeKey);
    } else {
      // Like
      comment.likes += 1;
      await this.cacheService.set(likeKey, true, 86400); // Cache for 1 day
    }

    await this.commentsRepository.save(comment);

    // Invalidate comments cache
    await this.cacheService.invalidatePattern(
      `comments:video:${comment.videoId}:*`,
    );

    return {
      liked: !hasLiked,
      likesCount: comment.likes,
    };
  }

  private async checkUserLiked(
    commentId: number,
    userId: number,
  ): Promise<boolean> {
    const likeKey = `comment:like:${commentId}:${userId}`;
    const liked = await this.cacheService.get(likeKey);
    return !!liked;
  }

  async getCommentStats(videoId: number): Promise<{ totalComments: number }> {
    const total = await this.commentsRepository.count({
      where: { videoId, isDeleted: false },
    });

    return { totalComments: total };
  }
}
