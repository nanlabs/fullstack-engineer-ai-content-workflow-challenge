import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { Movie } from './movie.entity';
import { MovieService } from './movie.service';

@Resolver(() => Movie)
export class MovieResolver {
  constructor(private readonly service: MovieService) {}

  @Query(() => Movie, { name: 'movie', nullable: true })
  async getMovie(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Movie | null> {
    return this.service.findDetail(id);
  }
}
