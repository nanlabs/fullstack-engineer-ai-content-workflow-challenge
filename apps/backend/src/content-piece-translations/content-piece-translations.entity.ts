import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ContentPiece } from '../content-pieces/content-piece.entity';
import { ModelProvider } from 'src/langchain/langchain.enum';

@ObjectType()
@Entity()
export class ContentPieceTranslation {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ModelProvider, { nullable: true })
  @Column({ type: 'enum', enum: ModelProvider, nullable: true })
  modelProvider: ModelProvider;

  @Field()
  @Column()
  languageCode: string;

  @Field()
  @Column()
  translatedTitle: string;

  @Field()
  @Column()
  translatedDescription: string;

  @Field()
  @Column({ default: false })
  isAIGenerated: boolean;

  @Field()
  @Column({ default: false })
  isHumanEdited: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => ContentPiece)
  @ManyToOne(() => ContentPiece, (contentPiece): ContentPieceTranslation[] => contentPiece.translations)
  contentPiece: ContentPiece;

  // For subscription purposes
  @Field()
  _type: string;

  @Field()
  campaignId: string;

  @Field()
  contentPieceId: string;
}
