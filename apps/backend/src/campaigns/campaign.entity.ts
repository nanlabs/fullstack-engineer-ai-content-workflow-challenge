import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, OneToMany, UpdateDateColumn } from 'typeorm';
import { ContentPiece } from '../content-pieces/content-piece.entity';

@Entity()
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ContentPiece, (contentPiece) => contentPiece.campaign)
  contentPieces: ContentPiece[];
}
