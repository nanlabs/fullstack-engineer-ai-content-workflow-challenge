import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Campaign } from '../campaigns/campaign.entity';
import { ContentPieceTranslation } from '../content-piece-translations/content-piece-translations.entity';
import { ReviewState } from './review-state.enum';

@ObjectType()
@Entity()
export class ContentPiece {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ReviewState)
  @Column({
    type: 'enum',
    enum: ReviewState,
    default: ReviewState.Draft,
  })
  reviewState: ReviewState;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  aiGeneratedDraft: object;

  @Field()
  @Column()
  sourceLanguage: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => Campaign)
  @ManyToOne(() => Campaign, (campaign) => campaign.contentPieces)
  campaign: Campaign;

  @Field(() => [ContentPieceTranslation], { nullable: false })
  @OneToMany(() => ContentPieceTranslation, (translation): ContentPiece => translation.contentPiece)
  translations: ContentPieceTranslation[];

  // For subscription purposes
  @Field()
  _type: string;

  @Field()
  campaignId: string;
}
