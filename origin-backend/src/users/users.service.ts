import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findOrCreate(userData: Partial<User>): Promise<User> {
    const existing = await this.userRepo.findOneBy({ email: userData.email });

    if (existing) {
      const updated = this.userRepo.merge(existing, userData);
      return this.userRepo.save(updated);
    }

    const newUser = this.userRepo.create(userData);
    return this.userRepo.save(newUser);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOneBy({ email });
  }

  async updateTokens(email: string, accessToken: string, refreshToken: string): Promise<void> {
    await this.userRepo.update({ email }, { accessToken, refreshToken });
  }
}
