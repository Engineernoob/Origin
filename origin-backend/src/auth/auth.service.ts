import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/users.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateGoogleUser(profile: any): Promise<User> {
    const { id, emails, displayName, photos } = profile;
    const email = emails[0]?.value;

    if (!email) {
      throw new Error('Google profile missing email');
    }

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      user = await this.usersService.create({
        email,
        name: displayName,
        googleId: id,
        picture: photos[0]?.value,
      });
    } else {
      // Update user info if needed
      user = await this.usersService.update(user.id, {
        name: displayName,
        googleId: id,
        picture: photos[0]?.value,
      });
    }

    return user;
  }

  async login(user: User) {
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        createdAt: user.createdAt,
      },
    };
  }

  async getCurrentUser(userId: number): Promise<User | null> {
    return this.usersService.findById(userId);
  }
}