import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class RecommendationsService {
  constructor(private readonly usersService: UsersService) {}

  async getRecommendations(userId: string) {
    // Ensure userId is converted to number if your DB expects numeric IDs
    const user = await this.usersService.findById(Number(userId));

    if (!user) {
      throw new Error('User not found');
    }

    const watchedTags = user.watchedTags || [];
    const subscriptions = user.subscriptions || [];

    // Basic recommendation logic (placeholder)
    // In real implementation: fetch videos with similar tags, or from subscribed channels
    return {
      recommendedByTags: watchedTags.slice(0, 5),
      recommendedBySubscriptions: subscriptions.slice(0, 5),
    };
  }
}
