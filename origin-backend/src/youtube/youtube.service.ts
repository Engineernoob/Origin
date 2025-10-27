import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import type { YouTubeVideo } from '../common/types';

interface YouTubeSearchResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  regionCode: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeVideo[];
}

@Injectable()
export class YoutubeService {
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('YouTube API key not configured');
    }
  }

  findByTags(tags: string[]): Promise<YouTubeVideo[]> {
    throw new Error('Method not implemented.');
  }
  
  fetchRecentFromChannels(subs: string[]): Promise<YouTubeVideo[]> {
    throw new Error('Method not implemented.');
  }

  async searchVideos(query: string, accessToken?: string): Promise<YouTubeSearchResponse> {
    try {
      const headers: Record<string, string> = {};
      
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      } else if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      } else {
        throw new Error('No authentication provided for YouTube API');
      }

      const response: AxiosResponse<YouTubeSearchResponse> = await axios.get(`${this.baseUrl}/search`, {
        headers,
        params: {
          part: 'snippet',
          q: query,
          maxResults: 10,
          type: 'video',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('YouTube API search error:', error);
      throw error;
    }
  }

  async getSubscriptions(accessToken: string): Promise<YouTubeSearchResponse> {
    try {
      const response: AxiosResponse<YouTubeSearchResponse> = await axios.get(`${this.baseUrl}/subscriptions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          part: 'snippet',
          mine: true,
          maxResults: 10,
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('YouTube API subscriptions error:', error);
      throw error;
    }
  }

  async getRelatedVideos(videoId: string, accessToken?: string): Promise<YouTubeSearchResponse> {
    try {
      const headers: Record<string, string> = {};
      
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      } else if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      } else {
        throw new Error('No authentication provided for YouTube API');
      }

      const response: AxiosResponse<YouTubeSearchResponse> = await axios.get(`${this.baseUrl}/search`, {
        headers,
        params: {
          part: 'snippet',
          relatedToVideoId: videoId,
          type: 'video',
          maxResults: 10,
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('YouTube API related videos error:', error);
      throw error;
    }
  }
}
