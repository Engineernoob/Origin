// Common types and interfaces used throughout the application

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  iat?: number;
  exp?: number;
}

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface VideoUploadRequest {
  title: string;
  description?: string;
  tags?: string[];
  isRebelContent?: boolean;
}

export interface VideoAnalytics {
  views: number;
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
  watchTime: number;
  avgWatchTime: number;
  uniqueVideos: number;
  engagementRate: number;
  trendingScore: number;
}

export interface UserStats extends VideoAnalytics {
  subscriberCount?: number;
  uploadCount?: number;
  totalViews?: number;
  totalWatchTime?: number;
}

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SearchQuery extends PaginationQuery {
  q?: string;
  tag?: string;
  category?: string;
  sortBy?: 'relevance' | 'date' | 'views' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Redis interfaces
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

// YouTube API types
export interface YouTubeVideo {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
    channelTitle: string;
    tags: string[];
    categoryId: string;
    liveBroadcastContent: string;
    defaultLanguage?: string;
    localized?: {
      title: string;
      description: string;
    };
    defaultAudioLanguage?: string;
  };
  contentDetails: {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
    licensedContent: boolean;
    contentRating: object;
    projection: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    dislikeCount: string;
    favoriteCount: string;
    commentCount: string;
  };
}

// File upload types
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

export interface UploadMetadata {
  title: string;
  description?: string;
  tags?: string;
  isRebelContent?: string;
}

// Monitoring and metrics
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime?: number;
  details?: Record<string, any>;
}

export interface MetricsResponse {
  [key: string]: string | number | boolean;
}

// Cache types
export interface CacheOptions {
  ttl?: number;
  key?: string;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
}

// Database types
export interface FindManyOptions<T = any> {
  where?: Partial<T>;
  order?: Record<string, 'ASC' | 'DESC'>;
  take?: number;
  skip?: number;
  relations?: string[];
}

// WebSocket types
export interface SocketUser {
  id: string;
  userId: number;
  email: string;
  name: string;
  room?: string;
}

export interface SocketEvent {
  type: string;
  payload: any;
  timestamp: number;
  userId?: number;
  roomId?: string;
}

// Search types
export interface SearchRequest {
  query: string;
  filters?: {
    category?: string;
    duration?: string;
    uploadDate?: string;
    sortBy?: string;
  };
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Content moderation
export interface ModerationStatus {
  approved: boolean;
  flagged: boolean;
  reason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface ContentFilterRequest {
  content: string;
  type: 'title' | 'description' | 'comment';
}

export interface ContentFilterResponse {
  isApproved: boolean;
  confidence: number;
  flaggedReasons: string[];
}

// Recommendations
export interface RecommendationRequest {
  userId: number;
  videoId?: number;
  context?: 'homepage' | 'watch' | 'search' | 'trending';
  limit?: number;
}

export interface RecommendationResponse {
  videos: Array<{
    id: number;
    title: string;
    thumbnailUrl: string;
    views: number;
    creatorName: string;
    score: number;
    reason: string;
  }>;
}

// Analytics
export interface AnalyticsEvent {
  userId: string;
  eventType: string;
  resourceId?: string;
  resourceType?: 'video' | 'playlists' | 'user';
  timestamp: Date;
  properties?: Record<string, any>;
}

export interface AnalyticsQuery {
  startDate: Date;
  endDate: Date;
  eventType?: string;
  userId?: string;
  resourceType?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface AnalyticsResult {
  count: number;
  uniqueUsers: number;
  period: string;
  data: Array<{
    date: string;
    value: number;
  }>;
}

// Error types
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object[] ? T[P] : T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Environment type guards
export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT?: string;
  DB_HOST: string;
  DB_PORT?: string;
  DB_USER: string;
  DB_PASS: string;
  DB_NAME: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  FRONTEND_URL?: string;
}
