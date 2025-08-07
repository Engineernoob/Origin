import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class YoutubeService {
  findByTags(tags: any) {
      throw new Error('Method not implemented.');
  }
  fetchRecentFromChannels(subs: any) {
      throw new Error('Method not implemented.');
  }
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';

  async searchVideos(query: string, accessToken: string) {
    const res = await axios.get(`${this.baseUrl}/search`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        part: 'snippet',
        q: query,
        maxResults: 10,
        type: 'video',
      },
    });
    return res.data;
  }

  async getSubscriptions(accessToken: string) {
    const res = await axios.get(`${this.baseUrl}/subscriptions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        part: 'snippet',
        mine: true,
        maxResults: 10,
      },
    });
    return res.data;
  }

  async getRelatedVideos(videoId: string, accessToken: string) {
    const res = await axios.get(`${this.baseUrl}/search`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        part: 'snippet',
        relatedToVideoId: videoId,
        type: 'video',
        maxResults: 10,
      },
    });
    return res.data;
  }
}
