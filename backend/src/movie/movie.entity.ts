import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Scene } from '../scene/scene.entity';

@ObjectType()
@Entity()
export class Movie {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field()
  @Column({ length: 255 })
  title!: string;

  @Field()
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Field(() => [Scene])
  @OneToMany(() => Scene, (scene) => scene.movie)
  scenes!: Scene[];
}
