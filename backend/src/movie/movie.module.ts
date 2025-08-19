import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './movie.entity';
import { MovieService } from './movie.service';
import { MovieController } from './movie.controller';
import { MovieResolver } from './movie.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Movie])],
  controllers: [MovieController],
  providers: [MovieService, MovieResolver],
})
export class MovieModule {}
