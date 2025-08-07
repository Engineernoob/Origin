import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  accessToken: string;

  @Column()
  refreshToken: string;

  @Column({ nullable: true })
  picture?: string;

  @Column('simple-array', { default: '' }) // Stores tags as CSV
  watchedTags: string[];

  @Column('simple-array', { default: '' }) // Stores subscriptions as CSV
  subscriptions: string[];
}
