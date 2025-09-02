import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from '../cache/cache.service';

export interface SearchQuery {
  query: string;
  filters: SearchFilters;
  sort: SortOptions;
  pagination: PaginationOptions;
  userId?: number;
}

export interface SearchFilters {
  uploadDate?: 'hour' | 'today' | 'week' | 'month' | 'year';
  duration?: 'short' | 'medium' | 'long'; // <4min, 4-20min, >20min
  features?: ('hd' | '4k' | 'subtitles' | 'creative_commons' | 'live')[];
  sortBy?: 'relevance' | 'upload_date' | 'view_count' | 'rating';
  type?: 'video' | 'playlist' | 'channel';
  category?: string;
  language?: string;
  region?: string;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
  secondarySort?: SortOptions;
}

export interface SearchResult {
  videos: VideoSearchResult[];
  channels: ChannelSearchResult[];
  playlists: PlaylistSearchResult[];
  totalResults: number;
  searchTime: number;
  suggestions: string[];
  relatedSearches: string[];
}

export interface VideoSearchResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  viewCount: number;
  publishedAt: Date;
  channel: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
  };
  relevanceScore: number;
  highlights: {
    title?: string;
    description?: string;
  };
}

@Injectable()
export class SearchDiscoveryService {
  private readonly logger = new Logger(SearchDiscoveryService.name);
  private readonly indexName = 'videos_v2';

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private cacheService: CacheService,
  ) {
    this.initializeSearchIndex();
  }

  async search(searchQuery: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      // Build Elasticsearch query
      const esQuery = this.buildElasticsearchQuery(searchQuery);
      
      // Execute search
      const response = await this.elasticsearchService.search({
        index: this.indexName,
        body: esQuery,
        timeout: '5s',
      });

      // Process results
      const results = this.processSearchResults(response.body, searchQuery);
      
      // Generate search suggestions
      const suggestions = await this.generateSuggestions(searchQuery.query);
      
      // Log search for analytics
      await this.logSearch(searchQuery, results.totalResults);
      
      const searchTime = Date.now() - startTime;
      
      return {
        ...results,
        searchTime,
        suggestions,
        relatedSearches: await this.getRelatedSearches(searchQuery.query),
      };
      
    } catch (error) {
      this.logger.error('Search error:', error);
      throw error;
    }
  }

  private buildElasticsearchQuery(searchQuery: SearchQuery): any {
    const { query, filters, sort, pagination } = searchQuery;
    
    // Main query structure
    const esQuery: any = {
      size: pagination.size || 20,
      from: pagination.offset || 0,
      query: {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: []
        }
      },
      sort: [],
      highlight: {
        fields: {
          title: { pre_tags: ['<mark>'], post_tags: ['</mark>'] },
          description: { pre_tags: ['<mark>'], post_tags: ['</mark>'] },
          'channel.name': { pre_tags: ['<mark>'], post_tags: ['</mark>'] }
        }
      },
      aggs: {
        categories: {
          terms: { field: 'category.keyword', size: 10 }
        },
        duration_ranges: {
          range: {
            field: 'duration',
            ranges: [
              { key: 'short', to: 240 },
              { key: 'medium', from: 240, to: 1200 },
              { key: 'long', from: 1200 }
            ]
          }
        },
        upload_date_ranges: {
          date_range: {
            field: 'publishedAt',
            ranges: [
              { key: 'hour', from: 'now-1h' },
              { key: 'today', from: 'now-1d' },
              { key: 'week', from: 'now-7d' },
              { key: 'month', from: 'now-30d' },
              { key: 'year', from: 'now-365d' }
            ]
          }
        }
      }
    };

    // Text search with multiple strategies
    if (query && query.trim()) {
      const textQuery = {
        bool: {
          should: [
            // Exact phrase match (highest priority)
            {
              match_phrase: {
                title: {
                  query: query,
                  boost: 10
                }
              }
            },
            // Title match with synonyms
            {
              multi_match: {
                query: query,
                fields: ['title^5', 'title.synonyms^3'],
                type: 'best_fields',
                fuzziness: 'AUTO',
                boost: 5
              }
            },
            // Description and tags
            {
              multi_match: {
                query: query,
                fields: ['description^2', 'tags^3', 'category'],
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            },
            // Channel name match
            {
              nested: {
                path: 'channel',
                query: {
                  match: {
                    'channel.name': {
                      query: query,
                      boost: 2
                    }
                  }
                }
              }
            },
            // Auto-complete/partial match
            {
              match_phrase_prefix: {
                'title.autocomplete': {
                  query: query,
                  boost: 1.5
                }
              }
            }
          ],
          minimum_should_match: 1
        }
      };

      esQuery.query.bool.must.push(textQuery);
    } else {
      // No search query - show trending/popular content
      esQuery.query.bool.must.push({ match_all: {} });
    }

    // Apply filters
    if (filters.uploadDate) {
      const dateRanges = {
        hour: 'now-1h',
        today: 'now-1d',
        week: 'now-7d',
        month: 'now-30d',
        year: 'now-365d'
      };
      
      esQuery.query.bool.filter.push({
        range: {
          publishedAt: { gte: dateRanges[filters.uploadDate] }
        }
      });
    }

    if (filters.duration) {
      const durationRanges = {
        short: { lt: 240 },
        medium: { gte: 240, lt: 1200 },
        long: { gte: 1200 }
      };
      
      esQuery.query.bool.filter.push({
        range: { duration: durationRanges[filters.duration] }
      });
    }

    if (filters.category) {
      esQuery.query.bool.filter.push({
        term: { 'category.keyword': filters.category }
      });
    }

    if (filters.language) {
      esQuery.query.bool.filter.push({
        term: { 'language.keyword': filters.language }
      });
    }

    if (filters.features) {
      filters.features.forEach(feature => {
        switch (feature) {
          case 'hd':
            esQuery.query.bool.filter.push({
              range: { 'resolution.height': { gte: 720 } }
            });
            break;
          case '4k':
            esQuery.query.bool.filter.push({
              range: { 'resolution.height': { gte: 2160 } }
            });
            break;
          case 'subtitles':
            esQuery.query.bool.filter.push({
              term: { hasSubtitles: true }
            });
            break;
          case 'creative_commons':
            esQuery.query.bool.filter.push({
              term: { 'license.keyword': 'Creative Commons' }
            });
            break;
          case 'live':
            esQuery.query.bool.filter.push({
              term: { isLive: true }
            });
            break;
        }
      });
    }

    // Boost popular and recent content
    esQuery.query.bool.should.push(
      // Recent videos boost
      {
        function_score: {
          filter: { range: { publishedAt: { gte: 'now-7d' } } },
          boost: 1.2
        }
      },
      // High view count boost
      {
        function_score: {
          filter: { range: { viewCount: { gte: 10000 } } },
          boost: 1.1
        }
      },
      // Verified channels boost
      {
        nested: {
          path: 'channel',
          query: {
            term: { 'channel.verified': true }
          },
          boost: 1.15
        }
      }
    );

    // Apply sorting
    if (sort.field === 'relevance' || !sort.field) {
      // Default relevance sort with secondary factors
      esQuery.sort = [
        { _score: { order: 'desc' } },
        { viewCount: { order: 'desc' } },
        { publishedAt: { order: 'desc' } }
      ];
    } else {
      const sortField = this.mapSortField(sort.field);
      esQuery.sort.push({ [sortField]: { order: sort.order } });
      
      if (sort.secondarySort) {
        const secondaryField = this.mapSortField(sort.secondarySort.field);
        esQuery.sort.push({ [secondaryField]: { order: sort.secondarySort.order } });
      }
    }

    return esQuery;
  }

  private processSearchResults(response: any, searchQuery: SearchQuery): Partial<SearchResult> {
    const hits = response.hits.hits;
    const total = response.hits.total.value;
    
    const videos: VideoSearchResult[] = hits
      .filter((hit: any) => hit._source.type === 'video' || !hit._source.type)
      .map((hit: any) => ({
        id: hit._source.id,
        title: hit._source.title,
        description: hit._source.description,
        thumbnail: hit._source.thumbnail,
        duration: hit._source.duration,
        viewCount: hit._source.viewCount,
        publishedAt: new Date(hit._source.publishedAt),
        channel: hit._source.channel,
        relevanceScore: hit._score,
        highlights: hit.highlight ? {
          title: hit.highlight.title?.[0],
          description: hit.highlight.description?.[0]
        } : undefined
      }));

    const channels: ChannelSearchResult[] = hits
      .filter((hit: any) => hit._source.type === 'channel')
      .map((hit: any) => ({
        id: hit._source.id,
        name: hit._source.name,
        description: hit._source.description,
        avatar: hit._source.avatar,
        subscriberCount: hit._source.subscriberCount,
        verified: hit._source.verified,
        relevanceScore: hit._score
      }));

    const playlists: PlaylistSearchResult[] = hits
      .filter((hit: any) => hit._source.type === 'playlist')
      .map((hit: any) => ({
        id: hit._source.id,
        title: hit._source.title,
        description: hit._source.description,
        thumbnail: hit._source.thumbnail,
        videoCount: hit._source.videoCount,
        channel: hit._source.channel,
        relevanceScore: hit._score
      }));

    return {
      videos,
      channels,
      playlists,
      totalResults: total
    };
  }

  async generateSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

    try {
      const response = await this.elasticsearchService.search({
        index: this.indexName,
        body: {
          size: 0,
          suggest: {
            title_suggestions: {
              prefix: query,
              completion: {
                field: 'titleSuggest',
                size: 10,
                skip_duplicates: true
              }
            },
            phrase_suggestions: {
              text: query,
              phrase: {
                field: 'title',
                size: 5,
                direct_generator: [{
                  field: 'title',
                  suggest_mode: 'always',
                  min_word_length: 2
                }]
              }
            }
          }
        }
      });

      const completions = response.body.suggest.title_suggestions[0].options
        .map((option: any) => option.text);
      
      const phrases = response.body.suggest.phrase_suggestions[0].options
        .map((option: any) => option.text);

      return [...new Set([...completions, ...phrases])].slice(0, 10);
      
    } catch (error) {
      this.logger.error('Error generating suggestions:', error);
      return [];
    }
  }

  async getRelatedSearches(query: string): Promise<string[]> {
    const cacheKey = `related_searches:${query.toLowerCase()}`;
    const cached = await this.cacheService.get<string[]>(cacheKey);
    
    if (cached) return cached;

    try {
      // Find videos with similar terms and extract common search patterns
      const response = await this.elasticsearchService.search({
        index: 'search_logs',
        body: {
          size: 0,
          query: {
            bool: {
              should: [
                { match: { query: query } },
                { match: { 'clicked_videos.title': query } }
              ]
            }
          },
          aggs: {
            related_queries: {
              terms: {
                field: 'query.keyword',
                size: 10,
                min_doc_count: 2
              }
            }
          }
        }
      });

      const relatedSearches = response.body.aggregations.related_queries.buckets
        .map((bucket: any) => bucket.key)
        .filter((q: string) => q.toLowerCase() !== query.toLowerCase())
        .slice(0, 8);

      await this.cacheService.set(cacheKey, relatedSearches, 3600);
      return relatedSearches;
      
    } catch (error) {
      this.logger.error('Error getting related searches:', error);
      return [];
    }
  }

  async getTrendingSearches(region?: string, category?: string): Promise<string[]> {
    const cacheKey = `trending_searches:${region || 'global'}:${category || 'all'}`;
    const cached = await this.cacheService.get<string[]>(cacheKey);
    
    if (cached) return cached;

    try {
      const response = await this.elasticsearchService.search({
        index: 'search_logs',
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                { range: { timestamp: { gte: 'now-24h' } } },
                ...(region ? [{ term: { 'user.region': region } }] : []),
                ...(category ? [{ term: { 'clicked_videos.category': category } }] : [])
              ]
            }
          },
          aggs: {
            trending_queries: {
              terms: {
                field: 'query.keyword',
                size: 20,
                order: { search_velocity: 'desc' }
              },
              aggs: {
                search_velocity: {
                  derivative: {
                    buckets_path: '_count'
                  }
                }
              }
            }
          }
        }
      });

      const trending = response.body.aggregations.trending_queries.buckets
        .map((bucket: any) => bucket.key)
        .slice(0, 10);

      await this.cacheService.set(cacheKey, trending, 1800); // 30 minutes
      return trending;
      
    } catch (error) {
      this.logger.error('Error getting trending searches:', error);
      return [];
    }
  }

  private async logSearch(searchQuery: SearchQuery, resultsCount: number): Promise<void> {
    try {
      const searchLog = {
        query: searchQuery.query,
        filters: searchQuery.filters,
        results_count: resultsCount,
        user_id: searchQuery.userId,
        timestamp: new Date(),
        session_id: this.generateSessionId(),
      };

      await this.elasticsearchService.index({
        index: 'search_logs',
        body: searchLog
      });
    } catch (error) {
      this.logger.warn('Failed to log search:', error);
    }
  }

  private mapSortField(field: string): string {
    const fieldMap = {
      'upload_date': 'publishedAt',
      'view_count': 'viewCount',
      'rating': 'averageRating',
      'relevance': '_score'
    };
    
    return fieldMap[field] || field;
  }

  private async initializeSearchIndex(): Promise<void> {
    try {
      const exists = await this.elasticsearchService.indices.exists({
        index: this.indexName
      });

      if (!exists.body) {
        await this.createSearchIndex();
      }
    } catch (error) {
      this.logger.error('Error initializing search index:', error);
    }
  }

  private async createSearchIndex(): Promise<void> {
    const indexMapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          type: { type: 'keyword' }, // video, channel, playlist
          title: {
            type: 'text',
            analyzer: 'standard',
            fields: {
              keyword: { type: 'keyword' },
              synonyms: { type: 'text', analyzer: 'synonym_analyzer' },
              autocomplete: { type: 'search_as_you_type' }
            }
          },
          titleSuggest: { type: 'completion' },
          description: { type: 'text', analyzer: 'standard' },
          tags: { type: 'keyword' },
          category: { 
            type: 'text',
            fields: { keyword: { type: 'keyword' } }
          },
          duration: { type: 'integer' },
          viewCount: { type: 'long' },
          likeCount: { type: 'long' },
          publishedAt: { type: 'date' },
          language: { type: 'keyword' },
          region: { type: 'keyword' },
          resolution: {
            properties: {
              width: { type: 'integer' },
              height: { type: 'integer' }
            }
          },
          hasSubtitles: { type: 'boolean' },
          isLive: { type: 'boolean' },
          license: { type: 'keyword' },
          channel: {
            type: 'nested',
            properties: {
              id: { type: 'keyword' },
              name: { 
                type: 'text',
                fields: { keyword: { type: 'keyword' } }
              },
              verified: { type: 'boolean' },
              subscriberCount: { type: 'long' }
            }
          }
        }
      },
      settings: {
        analysis: {
          analyzer: {
            synonym_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'synonym_filter']
            }
          },
          filter: {
            synonym_filter: {
              type: 'synonym',
              synonyms: [
                'tutorial,guide,howto,how-to',
                'music,song,audio',
                'funny,comedy,humor',
                'news,breaking,latest'
              ]
            }
          }
        },
        number_of_shards: 3,
        number_of_replicas: 1
      }
    };

    await this.elasticsearchService.indices.create({
      index: this.indexName,
      body: indexMapping
    });

    this.logger.log(`Created search index: ${this.indexName}`);
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Supporting interfaces
interface ChannelSearchResult {
  id: string;
  name: string;
  description: string;
  avatar: string;
  subscriberCount: number;
  verified: boolean;
  relevanceScore: number;
}

interface PlaylistSearchResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoCount: number;
  channel: {
    id: string;
    name: string;
  };
  relevanceScore: number;
}

interface PaginationOptions {
  size: number;
  offset: number;
}