import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './users/users.entity';
import { Video } from './videos/videos.entity';

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: +configService.get('DB_PORT', 5432),
  username: configService.get('DB_USER', 'postgres'),
  password: configService.get('DB_PASS', 'postgres'),
  database: configService.get('DB_NAME', 'origin'),
  entities: [User, Video],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false,
});
