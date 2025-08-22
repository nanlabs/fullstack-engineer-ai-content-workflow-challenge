import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scene } from './scene.entity';
import { Movie } from '../movie/movie.entity';
import { SceneResolver } from './scene.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Scene, Movie])],
  providers: [SceneResolver],
})
export class SceneModule {}
