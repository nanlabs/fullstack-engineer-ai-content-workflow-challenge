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
    @InjectRepository(Scene) private readonly sceneRepo: Repository<Scene>,
    @InjectRepository(Movie) private readonly movieRepo: Repository<Movie>,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Mutation(() => Scene)
  async createScene(@Args('input') input: CreateSceneInput): Promise<Scene> {
    // --- Normalize inputs ---
    const name = input.name?.trim();
    const description = input.description?.trim() ?? null;

    // Basic validations
    if (!name) throw new BadRequestException('Scene name is required');
    if (name.length > 255)
      throw new BadRequestException('Scene name is too long (max 255 chars)');
    if (description && description.length > 255) {
      throw new BadRequestException(
        'Scene description is too long (max 255 chars)',
      );
    }

    // Load minimal movie fields needed
    const movie = await this.movieRepo.findOne({
      where: { id: input.movieId },
      select: { id: true, title: true },
    });
    if (!movie) throw new NotFoundException('Movie not found');

    // OPTIONAL: enforce simple uniqueness by name within the movie (business rule-dependent)
    const dup = await this.sceneRepo.exists({
      where: { movie: { id: movie.id }, name },
    });
    if (dup) {
      // NOTE: Check with product if this should be an error or just allow duplicates.
      throw new BadRequestException(
        'A scene with this name already exists for this movie',
      );
    }

    // Create and persist scene
    const scene = this.sceneRepo.create({
      name,
      movie,
      description,
    });
    const saved = await this.sceneRepo.save(scene);

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
