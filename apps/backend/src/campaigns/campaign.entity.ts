import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, OneToMany, UpdateDateColumn } from 'typeorm';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ContentPiece } from '../content-pieces/content-piece.entity';

@ObjectType()
@Entity()
export class Campaign {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field()
  @Column()
  description: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => [ContentPiece], { defaultValue: [] })
  @OneToMany(() => ContentPiece, (contentPiece) => contentPiece.campaign)
  contentPieces: ContentPiece[];

  // For subscription purposes
  @Field()
  _type: string;
}
