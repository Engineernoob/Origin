import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('video_analytics')
@Index(['videoId', 'eventType', 'timestamp'])
@Index(['channelId', 'eventType', 'timestamp'])
@Index(['userId', 'eventType', 'timestamp'])
export class VideoAnalytics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['view', 'like', 'comment', 'share', 'subscribe', 'watch_time', 'click', 'impression'],
  })
  @Index()
  eventType: string;

  @Column({ nullable: true })
  @Index()
  userId: number;

  @Column({ nullable: true })
  @Index()
  videoId: number;

  @Column({ nullable: true })
  @Index()
  channelId: number;

  @Column('jsonb', { default: {} })
  metadata: any;

  @CreateDateColumn()
  @Index()
  timestamp: Date;

  @Column({ nullable: true })
  sessionId: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  deviceType: string;

  @Column({ nullable: true })
  referrer: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;
}