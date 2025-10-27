import {
  Controller,
  Get,
  Query,
  Req,
  Param,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { YoutubeService } from '../youtube/youtube.service';

@UseGuards(AuthGuard('google'))
@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Get('search')
  async search(@Query('q') query: string, @Req() req) {
    const accessToken = req.user?.accessToken;
    if (!accessToken) {
      throw new UnauthorizedException('User is not authenticated.');
    }

    return this.youtubeService.searchVideos(query, accessToken);
  }

  @Get('subscriptions')
  async getSubscriptions(@Req() req) {
    const accessToken = req.user?.accessToken;
    if (!accessToken) {
      throw new UnauthorizedException('User is not authenticated.');
    }

    return this.youtubeService.getSubscriptions(accessToken);
  }

  @Get('related/:videoId')
  async getRelated(@Param('videoId') videoId: string, @Req() req) {
    const accessToken = req.user?.accessToken;
    if (!accessToken) {
      throw new UnauthorizedException('User is not authenticated.');
    }

    return this.youtubeService.getRelatedVideos(videoId, accessToken);
  }
}
