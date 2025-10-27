import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Comment } from '../comments/comments.entity';

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 512 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 255 })
  creatorName!: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  creatorAvatar!: string | null;

  @Column({ type: 'boolean', default: false })
  creatorVerified!: boolean;

  @Column({ type: 'varchar', length: 64, default: '' })
  creatorSubscribers!: string;

  // path or URL to playable asset (MP4/HLS)
  @Column({ type: 'varchar', length: 2048 })
  videoUrl!: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'integer', default: 0 })
  likes!: number;

  @Column({ type: 'integer', default: 0 })
  dislikes!: number;

  @Column({ type: 'integer', default: 0 })
  views!: number;

  @Column({ type: 'boolean', default: false })
  isRebelContent!: boolean;

  // Stores as comma-separated string in Postgres
  @Column('simple-array', { nullable: true })
  tags!: string[] | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  uploadedAt!: Date;

  @OneToMany(() => Comment, (comment) => comment.video)
  comments!: Comment[];
}
