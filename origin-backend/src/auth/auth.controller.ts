import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    return { msg: 'Redirecting to Google...' };
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req) {
    const user = req.user;

    // Save or update user in database
    const dbUser = await this.usersService.findOrCreate({
      email: user.email,
      name: user.name,
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
      picture: user.picture,
    });

    return {
      msg: 'Authenticated successfully',
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.picture,
      },
    };
  }
}
