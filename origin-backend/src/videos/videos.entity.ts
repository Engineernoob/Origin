import {
    Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn,
  } from 'typeorm';
  
  @Entity('videos')
  export class Video {
    @PrimaryGeneratedColumn()
    id!: number;
  
    // If you mirror YouTube, store their ID too
    @Index({ unique: true })
    @Column({ nullable: true })
    externalId!: string | null;
  
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
  
    // path or URL to playable asset (MP4/HLS)
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