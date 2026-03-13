import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContentPiece } from '../content-piece/content-pieces.entity';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  topic: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column('text', { array: true, default: () => "'{}'" })
  languages: string[];

  @Column()
  llmProvider: string;

  @Column()
  model: string;

  // Relación: Una campaña tiene muchas piezas
  @OneToMany(() => ContentPiece, (piece) => piece.campaign)
  pieces: ContentPiece[];

  @CreateDateColumn()
  createdAt: Date;
}