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

@ObjectType()
@Entity()
export class Scene {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field()
  @Column({ length: 255 })
  name!: string;

  @Field()
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => Movie, (movie) => movie.scenes, { onDelete: 'CASCADE' })
  movie!: Movie;

  @Field(() => [Track])
  @OneToMany(() => Track, (track) => track.scene)
  tracks!: Track[];
}
