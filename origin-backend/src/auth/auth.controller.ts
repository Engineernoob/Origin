// auth.controller.ts
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { Request } from 'express';
import type { GoogleUser, JwtPayload } from '../common/types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // passport will redirect to Google
    return { msg: 'Redirecting to Google...' };
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request & { user: GoogleUser }, @Res() res: Response) {
    const u = req.user; // from GoogleStrategy.validate

    // upsert user
    const dbUser = await this.usersService.findOrCreate({
      email: u.email,
      name: u.name,
      picture: u.picture,
      accessToken: u.accessToken, // store securely if you need YouTube-on-behalf
      refreshToken: u.refreshToken, // idem
    });

    // sign a JWT for the frontend (no Google scopes needed on FE)
    const payload: JwtPayload = {
      sub: dbUser.id.toString(),
      email: dbUser.email,
      name: dbUser.name,
      picture: dbUser.picture,
    };
    
    const token = await this.jwt.signAsync(payload);

    const frontend =
      this.cfg.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    // Option A: redirect with token in query
    res.redirect(
      `${frontend}/auth/callback?token=${encodeURIComponent(token)}`,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Req() req: Request & { user: JwtPayload }) {
    const userId = typeof req.user.sub === 'string' ? parseInt(req.user.sub, 10) : req.user.sub;
    const user = await this.authService.getCurrentUser(userId);
    if (!user) {
      return { error: 'User not found' };
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      watchedTags: user.watchedTags,
      subscriptions: user.subscriptions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
