import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Field, GraphQLISODateTime } from '@nestjs/graphql';

export abstract class BaseEntityTimestamps {
  @Field(() => GraphQLISODateTime)
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}