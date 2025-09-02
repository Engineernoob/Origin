import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';

export interface VideoDocument {
  id: string;
  title: string;
  description: string;
  userId: number;
  userName: string;
  views: number;
  likes: number;
  duration: number;
  createdAt: Date;
  tags: string[];
  category: string;
  isPublic: boolean;
}

export interface SearchQuery {
  query?: string;
  tags?: string[];
  category?: string;
  userId?: number;
  sortBy?: 'relevance' | 'views' | 'date' | 'likes';
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  page?: number;
  size?: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly indexName = 'videos';

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {
    this.initializeIndex();
  }

  private async initializeIndex(): Promise<void> {
    try {
      const indexExists = await this.elasticsearchService.indices.exists({
        index: this.indexName,
      });

      if (!indexExists) {
        await this.createIndex();
      }
    } catch (error) {
      this.logger.error('Error initializing Elasticsearch index:', error);
    }
  }

  private async createIndex(): Promise<void> {
    const indexMapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          title: { 
            type: 'text',
            analyzer: 'standard',
            fields: {
              keyword: { type: 'keyword' },
              suggest: { type: 'completion' }
            }
          },
          description: { 
            type: 'text',
            analyzer: 'standard' 
          },
          userId: { type: 'integer' },
          userName: { 
            type: 'text',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          views: { type: 'integer' },
          likes: { type: 'integer' },
          duration: { type: 'integer' },
          createdAt: { type: 'date' },
          tags: { type: 'keyword' },
          category: { type: 'keyword' },
          isPublic: { type: 'boolean' },
        },
      },
      settings: {
        analysis: {
          analyzer: {
            video_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'stop', 'snowball'],
            },
          },
        },
      },
    };

    await this.elasticsearchService.indices.create({
      index: this.indexName,
      body: indexMapping,
    });

    this.logger.log(`Created Elasticsearch index: ${this.indexName}`);
  }

  async indexVideo(video: VideoDocument): Promise<void> {
    try {
      await this.elasticsearchService.index({
        index: this.indexName,
        id: video.id,
        body: video,
      });

      this.logger.log(`Indexed video: ${video.id}`);
    } catch (error) {
      this.logger.error(`Error indexing video ${video.id}:`, error);
      throw error;
    }
  }

  async searchVideos(searchQuery: SearchQuery): Promise<any> {
    try {
      const {
        query = '',
        tags = [],
        category,
        userId,
        sortBy = 'relevance',
        timeRange = 'all',
        page = 1,
        size = 20,
      } = searchQuery;

      const must = [];
      const filter = [{ term: { isPublic: true } }];

      // Text search
      if (query) {
        must.push({
          multi_match: {
            query,
            fields: ['title^3', 'description^2', 'userName', 'tags'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        });
      }

      // Tag filter
      if (tags.length > 0) {
        filter.push({
          terms: { tags: tags },
        });
      }

      // Category filter
      if (category) {
        filter.push({
          term: { category },
        });
      }

      // User filter
      if (userId) {
        filter.push({
          term: { userId },
        });
      }

      // Time range filter
      if (timeRange !== 'all') {
        const timeMap = {
          hour: 'now-1h',
          day: 'now-1d',
          week: 'now-7d',
          month: 'now-30d',
          year: 'now-365d',
        };

        filter.push({
          range: {
            createdAt: {
              gte: timeMap[timeRange],
            },
          },
        });
      }

      // Build sort
      const sort = [];
      switch (sortBy) {
        case 'views':
          sort.push({ views: { order: 'desc' } });
          break;
        case 'date':
          sort.push({ createdAt: { order: 'desc' } });
          break;
        case 'likes':
          sort.push({ likes: { order: 'desc' } });
          break;
        default:
          if (query) {
            sort.push('_score');
          } else {
            sort.push({ createdAt: { order: 'desc' } });
          }
      }

      const searchBody = {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter,
          },
        },
        sort,
        from: (page - 1) * size,
        size,
        highlight: {
          fields: {
            title: {},
            description: {},
          },
        },
      };

      const result = await this.elasticsearchService.search({
        index: this.indexName,
        body: searchBody,
      });

      return {
        hits: result.body.hits.hits.map(hit => ({
          ...hit._source,
          score: hit._score,
          highlight: hit.highlight,
        })),
        total: result.body.hits.total.value,
        page,
        size,
        totalPages: Math.ceil(result.body.hits.total.value / size),
      };
    } catch (error) {
      this.logger.error('Error searching videos:', error);
      throw error;
    }
  }

  async getSuggestions(query: string, size = 10): Promise<string[]> {
    try {
      const result = await this.elasticsearchService.search({
        index: this.indexName,
        body: {
          suggest: {
            title_suggest: {
              prefix: query,
              completion: {
                field: 'title.suggest',
                size,
              },
            },
          },
        },
      });

      return result.body.suggest.title_suggest[0].options.map(
        option => option._source.title
      );
    } catch (error) {
      this.logger.error('Error getting suggestions:', error);
      return [];
    }
  }

  async getTrendingSearchTerms(size = 10): Promise<string[]> {
    try {
      const result = await this.elasticsearchService.search({
        index: 'search_logs', // Separate index for search logs
        body: {
          size: 0,
          query: {
            range: {
              timestamp: {
                gte: 'now-1d',
              },
            },
          },
          aggs: {
            trending_terms: {
              terms: {
                field: 'query.keyword',
                size,
                order: { _count: 'desc' },
              },
            },
          },
        },
      });

      return result.body.aggregations.trending_terms.buckets.map(
        bucket => bucket.key
      );
    } catch (error) {
      this.logger.error('Error getting trending search terms:', error);
      return [];
    }
  }

  async deleteVideo(videoId: string): Promise<void> {
    try {
      await this.elasticsearchService.delete({
        index: this.indexName,
        id: videoId,
      });

      this.logger.log(`Deleted video from index: ${videoId}`);
    } catch (error) {
      this.logger.error(`Error deleting video ${videoId} from index:`, error);
    }
  }

  async updateVideoViews(videoId: string, views: number): Promise<void> {
    try {
      await this.elasticsearchService.update({
        index: this.indexName,
        id: videoId,
        body: {
          doc: { views },
        },
      });
    } catch (error) {
      this.logger.error(`Error updating views for video ${videoId}:`, error);
    }
  }
}