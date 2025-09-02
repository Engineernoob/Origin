import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/users.entity';
import { Video } from '../videos/videos.entity';

@Entity('moderation_actions')
@Index(['userId', 'createdAt'])
@Index(['videoId', 'createdAt'])
@Index(['action', 'createdAt'])
export class ModerationAction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  @Index()
  userId: number;

  @Column({ nullable: true })
  @Index()
  videoId: number;

  @Column({
    type: 'enum',
    enum: ['approved', 'rejected', 'flagged', 'review_required', 'auto_hidden'],
  })
  @Index()
  action: string;

  @Column({
    type: 'enum',
    enum: ['video', 'comment', 'title', 'description', 'username', 'channel'],
  })
  contentType: string;

  @Column('text', { nullable: true })
  content: string;

  @Column('float', { default: 0 })
  confidence: number;

  @Column('jsonb', { default: [] })
  reasons: string[];

  @Column('jsonb', { default: [] })
  flaggedContent: any[];

  @Column({ nullable: true })
  reviewedBy: number; // Admin/Moderator user ID

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @Column({ nullable: true })
  reviewedAt: Date;

  @Column('text', { nullable: true })
  reviewNotes: string;

  @Column({ default: false })
  appealed: boolean;

  @Column({ nullable: true })
  appealedAt: Date;

  @Column('text', { nullable: true })
  appealNotes: string;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Video, { nullable: true })
  @JoinColumn({ name: 'videoId' })
  video: Video;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer: User;
}