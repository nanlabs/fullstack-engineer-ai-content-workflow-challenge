import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Movie } from '../movie/movie.entity';
import { Track } from '../track/track.entity';
import { BaseEntityTimestamps } from '../common/base-entity';

@ObjectType()
@Entity('scenes')
export class Scene extends BaseEntityTimestamps {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field()
  @Column({ length: 255 })
  name!: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Field(() => Movie)
  @ManyToOne(() => Movie, (movie) => movie.scenes, { onDelete: 'CASCADE' })
  movie!: Movie;

  @Field(() => [Track])
  @OneToMany(() => Track, (track) => track.scene)
  tracks!: Track[];
}
