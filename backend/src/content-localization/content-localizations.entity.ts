import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ContentPiece } from '../content-piece/content-pieces.entity';
import { ReviewStatus } from '../status-enum';

@Entity('content_localizations')
export class ContentLocalization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  languageCode: string; // Ej: "en", "es", "pt"

  @Column({ type: 'text', nullable: true })
  titleSuggestion: string;

  @Column({ type: 'text', nullable: true })
  bodySuggestion: string;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.DRAFT,
  })
  status: ReviewStatus;

  @Column({ type: 'jsonb', nullable: true })
  aiMetadata: any; // Para guardar keywords, tono, etc.

  @ManyToOne(() => ContentPiece, (piece) => piece.localizations, { onDelete: 'CASCADE' })
  contentPiece: ContentPiece;

  @UpdateDateColumn()
  updatedAt: Date;
}