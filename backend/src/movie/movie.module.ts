import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './movie.entity';
import { MovieResolver } from './movie.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Movie])],
  providers: [MovieResolver],
})
export class MovieModule {}
