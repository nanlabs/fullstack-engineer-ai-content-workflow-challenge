import { PubSub } from 'graphql-subscriptions';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import {
  Resolver,
  Mutation,
  Args,
  InputType,
  Field,
  ID,
} from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Scene } from './scene.entity';
import { Movie } from 'src/movie/movie.entity';
import { PUB_SUB } from 'src/realtime/pubsub.token';
import {
  MovieEventKind,
  emitMovieEvent,
  emitGlobalMoviesEvent,
} from 'src/realtime/events';

@InputType()
class CreateSceneInput {
  @Field(() => ID)
  movieId!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;
}

@Resolver(() => Scene)
export class SceneResolver {
  constructor(
    @InjectRepository(Scene) private readonly scenes: Repository<Scene>,
    @InjectRepository(Movie) private readonly movies: Repository<Movie>,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Mutation(() => Scene, { name: 'createScene' })
  async createScene(@Args('input') input: CreateSceneInput): Promise<Scene> {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('Scene name is required');
    }

    const movie = await this.movies.findOne({ where: { id: input.movieId } });
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    // OPTIONAL: enforce simple uniqueness by name within the movie (business rule-dependent)
    const dup = await this.scenes.count({
      where: { movie: { id: movie.id }, name },
    });
    if (dup > 0) {
      // NOTE: Check with product if this should be an error or just allow duplicates.
      throw new BadRequestException(
        'A scene with this name already exists for this movie',
      );
    }

    // Create and persist scene
    const scene = this.scenes.create({
      name,
      movie,
      description: input.description?.trim() ?? null,
    });
    const saved = await this.scenes.save(scene);

    // --- Emit real-time updates ---
    await emitMovieEvent(
      this.pubSub,
      scene.movie.id,
      MovieEventKind.SCENE_CREATED,
    );
    await emitGlobalMoviesEvent(
      this.pubSub,
      scene.movie.title,
      MovieEventKind.SCENE_CREATED,
    );

    return saved;
  }
}
