import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('training_data')
@Index(['source', 'createdAt'])
@Index(['videoId'])
export class TrainingData {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  @Index()
  videoId!: string;

  @Column('jsonb')
  features!: {
    videoId: string;
    titleLength: number;
    descriptionLength: number;
    tagCount: number;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    durationMinutes: number;
    categoryId: string;
    publishHour: number;
    publishDayOfWeek: number;
    titleSentiment: number;
    descriptionSentiment: number;
    engagementRate: number;
    viewsPerHour: number;
    tagsPopularity: number[];
    [key: string]: any;
  };

  @Column('jsonb')
  labels!: {
    viralScore: number;
    engagementScore: number;
    retentionScore: number;
    categoryPopularity: number;
    [key: string]: any;
  };

  @Column({
    type: 'enum',
    enum: ['youtube_api', 'manual', 'scraped', 'user_generated'],
    default: 'youtube_api',
  })
  @Index()
  source!: string;

  @Column({ type: 'float', nullable: true })
  predictionAccuracy!: number; // For tracking model performance

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Additional metadata
  @Column('jsonb', { nullable: true })
  rawData!: any; // Store original API response for debugging

  @Column({ nullable: true })
  trainingSetId!: string; // For organizing training batches

  @Column({ default: false })
  isValidated!: boolean; // For human validation of training quality
}
