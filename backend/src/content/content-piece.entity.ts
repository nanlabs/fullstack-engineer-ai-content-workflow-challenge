import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Campaign } from '../campaigns/campaign.entity';
import { ReviewState } from './review-state.enum';

@Entity({ name: 'content_pieces' })
export class ContentPiece {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campaignId: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.contentPieces, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @Column({ length: 50 })
  type: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  originalText: string;

  @Column({ type: 'text', nullable: true })
  aiDraft?: string;

  @Column({ type: 'jsonb', nullable: true })
  translations?: Record<string, string>;

  @Column({ type: 'varchar', length: 20, default: ReviewState.Draft })
  reviewState: ReviewState;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
