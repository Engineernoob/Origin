import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from '../cache/cache.service';
import { ModerationAction } from './moderation-action.entity';

export interface ModerationResult {
  isAllowed: boolean;
  confidence: number;
  reasons: string[];
  suggestedActions: string[];
  flaggedContent?: {
    type:
      | 'profanity'
      | 'spam'
      | 'harassment'
      | 'adult'
      | 'violence'
      | 'copyright';
    severity: 'low' | 'medium' | 'high';
    details: string;
  }[];
}

export interface ContentModerationRequest {
  type: 'video' | 'comment' | 'title' | 'description';
  content: string;
  userId?: number;
  videoId?: number;
  metadata?: any;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  // Profanity word lists (in production, this would be more comprehensive)
  private readonly profanityPatterns = [
    /\b(fuck|shit|damn|bitch|asshole|cunt|whore|slut)\b/gi,
    /\b(hate|kill|die|suicide|murder)\b/gi,
  ];

  private readonly spamPatterns = [
    /(.)\1{10,}/gi, // Repeated characters
    /https?:\/\/[^\s]+/gi, // URLs
    /\b(buy now|click here|free money|get rich|make money fast)\b/gi,
    /\b(.)\1*(.)\2*(.)\3*/gi, // Excessive repetition
  ];

  // Harassment detection patterns
  private readonly harassmentPatterns = [
    /\b(stupid|idiot|loser|pathetic|worthless|ugly|fat)\b/gi,
    /\b(kys|kill yourself|go die)\b/gi,
  ];

  constructor(
    @InjectRepository(ModerationAction)
    private moderationRepository: Repository<ModerationAction>,
    private cacheService: CacheService,
  ) {}

  async moderateContent(
    request: ContentModerationRequest,
  ): Promise<ModerationResult> {
    const { type, content, userId, videoId } = request;

    try {
      // Check user's moderation history
      const userHistory = await this.getUserModerationHistory(userId);

      // Run multiple moderation checks in parallel
      const [
        profanityResult,
        spamResult,
        harassmentResult,
        lengthResult,
        rateLimit,
      ] = await Promise.all([
        this.checkProfanity(content),
        this.checkSpam(content, userId),
        this.checkHarassment(content),
        this.checkContentLength(content, type),
        this.checkRateLimit(userId, type),
      ]);

      const flaggedContent = [];
      const reasons = [];
      const suggestedActions = [];
      let confidence = 0;

      // Analyze profanity
      if (profanityResult.detected) {
        flaggedContent.push({
          type: 'profanity' as const,
          severity: profanityResult.severity,
          details: profanityResult.details,
        });
        reasons.push('Contains inappropriate language');
        confidence += profanityResult.severity === 'high' ? 0.8 : 0.5;
      }

      // Analyze spam
      if (spamResult.detected) {
        flaggedContent.push({
          type: 'spam' as const,
          severity: spamResult.severity,
          details: spamResult.details,
        });
        reasons.push('Suspected spam content');
        confidence += spamResult.severity === 'high' ? 0.9 : 0.6;
      }

      // Analyze harassment
      if (harassmentResult.detected) {
        flaggedContent.push({
          type: 'harassment' as const,
          severity: harassmentResult.severity,
          details: harassmentResult.details,
        });
        reasons.push('Contains harassment or bullying');
        confidence += harassmentResult.severity === 'high' ? 0.9 : 0.7;
      }

      // Check content length
      if (!lengthResult.valid) {
        reasons.push(lengthResult.reason);
        confidence += 0.3;
      }

      // Check rate limiting
      if (!rateLimit.allowed) {
        reasons.push('Rate limit exceeded');
        suggestedActions.push('Temporary restriction');
        confidence += 0.5;
      }

      // Factor in user history
      if (userHistory.violations > 5) {
        confidence += 0.3;
        suggestedActions.push('Enhanced monitoring');
      }

      // Determine if content should be allowed
      const isAllowed = confidence < 0.7 && flaggedContent.length === 0;

      // Suggest actions based on severity
      if (confidence > 0.8) {
        suggestedActions.push('Auto-reject', 'Notify moderators');
      } else if (confidence > 0.5) {
        suggestedActions.push('Manual review', 'Shadow ban');
      } else if (confidence > 0.3) {
        suggestedActions.push('Flag for review');
      }

      const result: ModerationResult = {
        isAllowed,
        confidence: Math.min(confidence, 1),
        reasons,
        suggestedActions,
        flaggedContent: flaggedContent.length > 0 ? flaggedContent : undefined,
      };

      // Log moderation action
      await this.logModerationAction({
        userId,
        videoId,
        contentType: type,
        content: content.substring(0, 500), // Truncate for storage
        result,
        action: isAllowed ? 'approved' : 'rejected',
      });

      return result;
    } catch (error) {
      this.logger.error('Error in content moderation:', error);

      // In case of error, allow content but flag for manual review
      return {
        isAllowed: true,
        confidence: 0,
        reasons: ['Moderation system error - flagged for manual review'],
        suggestedActions: ['Manual review required'],
      };
    }
  }

  private async checkProfanity(content: string): Promise<any> {
    const matches = [];
    let severity = 'low';

    for (const pattern of this.profanityPatterns) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
        // More severe patterns get higher severity
        if (pattern.source.includes('hate|kill|die')) {
          severity = 'high';
        } else if (severity === 'low') {
          severity = 'medium';
        }
      }
    }

    return {
      detected: matches.length > 0,
      severity: matches.length > 3 ? 'high' : severity,
      details: `Found ${matches.length} inappropriate words`,
      matches,
    };
  }

  private async checkSpam(content: string, userId?: number): Promise<any> {
    const issues = [];
    let severity = 'low';

    // Check for repeated characters
    if (/(.)\1{5,}/g.test(content)) {
      issues.push('Excessive character repetition');
      severity = 'medium';
    }

    // Check for URLs (might be spam)
    const urlMatches = content.match(/https?:\/\/[^\s]+/g);
    if (urlMatches && urlMatches.length > 2) {
      issues.push('Multiple URLs detected');
      severity = 'high';
    }

    // Check for spam phrases
    for (const pattern of this.spamPatterns) {
      if (pattern.test(content)) {
        issues.push('Spam keywords detected');
        severity = 'high';
        break;
      }
    }

    // Check content length ratio
    const uniqueChars = new Set(content.toLowerCase()).size;
    const totalChars = content.length;
    if (totalChars > 50 && uniqueChars / totalChars < 0.3) {
      issues.push('Low content diversity');
      severity = 'medium';
    }

    // If user provided, check recent submission frequency
    if (userId) {
      const recentSubmissions = await this.getRecentSubmissions(userId);
      if (recentSubmissions > 10) {
        issues.push('High submission frequency');
        severity = 'high';
      }
    }

    return {
      detected: issues.length > 0,
      severity,
      details: issues.join(', '),
      issues,
    };
  }

  private async checkHarassment(content: string): Promise<any> {
    const matches = [];
    let severity = 'low';

    for (const pattern of this.harassmentPatterns) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
        if (pattern.source.includes('kys|kill yourself')) {
          severity = 'high';
        } else if (severity === 'low') {
          severity = 'medium';
        }
      }
    }

    return {
      detected: matches.length > 0,
      severity: matches.length > 2 ? 'high' : severity,
      details: `Found ${matches.length} harassment indicators`,
      matches,
    };
  }

  private checkContentLength(
    content: string,
    type: string,
  ): { valid: boolean; reason?: string } {
    const limits = {
      comment: { min: 1, max: 2000 },
      title: { min: 3, max: 100 },
      description: { min: 10, max: 5000 },
      video: { min: 0, max: Infinity },
    };

    const limit = limits[type] || { min: 0, max: Infinity };

    if (content.length < limit.min) {
      return {
        valid: false,
        reason: `Content too short (minimum ${limit.min} characters)`,
      };
    }

    if (content.length > limit.max) {
      return {
        valid: false,
        reason: `Content too long (maximum ${limit.max} characters)`,
      };
    }

    return { valid: true };
  }

  private async checkRateLimit(
    userId?: number,
    type?: string,
  ): Promise<{ allowed: boolean }> {
    if (!userId) return { allowed: true };

    const key = `rate_limit:${type}:${userId}`;
    const limit = type === 'comment' ? 60 : 10; // Comments: 60/hour, Others: 10/hour

    const allowed = await this.cacheService.checkRateLimit(key, limit, 3600);
    return { allowed };
  }

  private async getUserModerationHistory(
    userId?: number,
  ): Promise<{ violations: number; score: number }> {
    if (!userId) return { violations: 0, score: 1 };

    const cacheKey = `moderation_history:${userId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const violations = await this.moderationRepository.count({
      where: {
        userId,
        action: 'rejected',
        createdAt: new Date(thirtyDaysAgo.getTime()),
      },
    });

    const score = Math.max(0, 1 - violations * 0.1); // Decrease trust score
    const result = { violations, score };

    await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
    return result;
  }

  private async getRecentSubmissions(userId: number): Promise<number> {
    const key = `submissions:${userId}`;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    // This would check recent submission timestamps
    // For now, return 0 as placeholder
    return 0;
  }

  private async logModerationAction(data: any): Promise<void> {
    try {
      const action = this.moderationRepository.create({
        userId: data.userId,
        videoId: data.videoId,
        contentType: data.contentType,
        content: data.content,
        action: data.action,
        confidence: data.result.confidence,
        reasons: data.result.reasons,
        flaggedContent: data.result.flaggedContent || [],
        createdAt: new Date(),
      });

      await this.moderationRepository.save(action);
    } catch (error) {
      this.logger.error('Failed to log moderation action:', error);
    }
  }

  // Admin methods
  async getModerationStats(days = 30): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await this.moderationRepository
      .createQueryBuilder('action')
      .select([
        'action.action',
        'action.contentType',
        'COUNT(*) as count',
        'AVG(action.confidence) as avgConfidence',
      ])
      .where('action.createdAt >= :startDate', { startDate })
      .groupBy('action.action, action.contentType')
      .getRawMany();

    return {
      period: `${days} days`,
      stats,
      totalActions: stats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
    };
  }

  async getViolationsByUser(userId: number, days = 30): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const violations = await this.moderationRepository.find({
      where: {
        userId,
        action: 'rejected',
        createdAt: new Date(startDate.getTime()),
      },
      order: { createdAt: 'DESC' },
    });

    return {
      userId,
      period: `${days} days`,
      violationCount: violations.length,
      violations,
    };
  }
}
