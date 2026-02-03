import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ContentPiece } from '../content/content-piece.entity';
import { CampaignStatus } from './campaign-status.enum';

@Entity({ name: 'campaigns' })
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 40, default: CampaignStatus.Active })
  status: CampaignStatus;

  @Column({ type: 'text', array: true, default: '{}' })
  targetLanguages: string[];

  @OneToMany(() => ContentPiece, (contentPiece) => contentPiece.campaign)
  contentPieces: ContentPiece[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
