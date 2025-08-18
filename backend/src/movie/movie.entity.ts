import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Scene } from '../scene/scene.entity';

@Entity()
export class Movie {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => Scene, (scene) => scene.movie)
  scenes!: Scene[];
}
