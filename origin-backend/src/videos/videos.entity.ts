// src/videos/video.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

type ExternalRef = {
  provider: 'youtube' | 'vimeo' | 'origin' | 'other';
  id: string; // e.g. YouTube videoId
  url?: string; // canonical link to the source
  meta?: Record<string, any>; // any extra fields you want to keep
};

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn()
  id!: number;

  // Structured reference to any external platform (jsonb)
  // NOTE: you can't use a simple unique index on jsonb; see note below.
  @Column({ type: 'jsonb', nullable: true })
  externalRef!: ExternalRef | null;

  @Index()
  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column()
  creatorName!: string;

  @Column({ nullable: true })
  creatorAvatar!: string | null;

  @Column({ default: false })
  creatorVerified!: boolean;

  @Column({ default: '' })
  creatorSubscribers!: string;

  // Path or URL to playable asset (MP4/HLS)
  @Column()
  videoUrl!: string;

  @Column({ nullable: true })
  thumbnailUrl!: string | null;

  @Column({ default: 0 })
  likes!: number;

  @Column({ default: 0 })
  dislikes!: number;

  @Column({ default: 0 })
  views!: number;

  @Column({ default: false })
  isRebelContent!: boolean;

  // fine for small lists; switch to jsonb if you need richer tag data
  @Column('simple-array', { nullable: true })
  tags!: string[] | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // for “uploaded at” style display
  @Column({ type: 'timestamptz', default: () => 'now()' })
  uploadedAt!: Date;
}
