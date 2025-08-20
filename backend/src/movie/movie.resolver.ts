import {
  Args,
  ID,
  Query,
  Resolver,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { Movie, MovieSummary } from './movie.entity';
import { MovieService } from './movie.service';

@Resolver(() => Movie)
export class MovieResolver {
  constructor(private readonly service: MovieService) {}

  @Query(() => Movie, { nullable: true })
  async movie(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Movie | null> {
    return this.service.findDetail(id);
  }

  @Query(() => [Movie])
  async movies(): Promise<Movie[]> {
    return this.service.findAll();
  }

  @ResolveField(() => MovieSummary)
  async summary(@Parent() movie: Movie): Promise<MovieSummary> {
    return this.service.getSummaryForMovie(movie.id);
  }
}
