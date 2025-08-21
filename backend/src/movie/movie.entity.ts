import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Scene } from '../scene/scene.entity';

@ObjectType()
export class MovieSummary {
  @Field(() => Int) totalScenes!: number;
  @Field(() => Int) totalTracks!: number;
  @Field(() => Int) withSong!: number;
  @Field(() => Int) pending!: number;
  @Field(() => Int) negotiation!: number;
  @Field(() => Int) approved!: number;
  @Field(() => Int) rejected!: number;
}

@ObjectType()
@Entity()
export class Movie {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field()
  @Column({ length: 255 })
  title!: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Field(() => [Scene])
  @OneToMany(() => Scene, (scene) => scene.movie)
  scenes!: Scene[];

  // This is a computed field, not stored in the database.
  // It summarizes licensing status counts and the number of tracks
  // without a song, calculated at runtime from related entities.
  @Field(() => MovieSummary)
  summary!: MovieSummary;
}
