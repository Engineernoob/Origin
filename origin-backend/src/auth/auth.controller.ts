// auth.controller.ts
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly usersService: UsersService,
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
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
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
    const token = await this.jwt.signAsync({
      sub: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      picture: dbUser.picture,
    });

    const frontend = this.cfg.get<string>('FRONTEND_URL')!;
    // Option A: redirect with token in query
    res.redirect(
      `${frontend}/auth/callback?token=${encodeURIComponent(token)}`,
    );
  }
}
