import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Campaign } from '../campaigns/campaign.entity';
import { ContentPieceTranslation } from '../content-piece-translations/content-piece-translation.entity';
import { ReviewState } from './review-state.enum';

@Entity()
export class ContentPiece {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReviewState,
    default: ReviewState.Draft,
  })
  reviewState: ReviewState;

  @Column({ type: 'jsonb', nullable: true })
  aiGeneratedDraft: object;

  @Column()
  sourceLanguage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Campaign, (campaign) => campaign.contentPieces)
  campaign: Campaign;

  @OneToMany(() => ContentPieceTranslation, (translation) => translation.contentPiece)
  translations: ContentPieceTranslation[];
}
