import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { BaseEntityTimestamps } from '../common/base-entity';

@ObjectType()
@Entity('songs')
export class Song extends BaseEntityTimestamps {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  artist!: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  duration?: number | null; // seconds
}
