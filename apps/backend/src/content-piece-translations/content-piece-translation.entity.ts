import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ContentPiece } from '../content-pieces/content-piece.entity';

@Entity()
export class ContentPieceTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  languageCode: string;

  @Column()
  translatedTitle: string;

  @Column()
  translatedDescription: string;

  @Column({ default: false })
  isAIGenerated: boolean;

  @Column({ default: false })
  isHumanEdited: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ContentPiece, (contentPiece): ContentPieceTranslation[] => contentPiece.translations)
  contentPiece: ContentPiece;
}
