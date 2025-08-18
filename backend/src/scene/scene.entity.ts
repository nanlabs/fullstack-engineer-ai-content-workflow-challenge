import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Movie } from '../movie/movie.entity';
import { Track } from '../track/track.entity';

@Entity()
export class Scene {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => Movie, (movie) => movie.scenes, { onDelete: 'CASCADE' })
  movie!: Movie;

  @OneToMany(() => Track, (track) => track.scene)
  tracks!: Track[];
}
