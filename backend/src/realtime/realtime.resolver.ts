import { PubSub } from 'graphql-subscriptions';
import { Inject } from '@nestjs/common';
import { Resolver, Args, ID, Subscription } from '@nestjs/graphql';
import { PUB_SUB } from './pubsub.token';
import { MovieEvent, movieTopic, ALL_MOVIES_TOPIC } from './events';

@Resolver()
export class RealtimeResolver {
  constructor(@Inject(PUB_SUB) private readonly pubSub: PubSub) {}

  @Subscription(() => MovieEvent, { name: 'movieEvents' })
  movieEvents(@Args('movieId', { type: () => ID }) movieId: string) {
    return this.pubSub.asyncIterableIterator<MovieEvent>(movieTopic(movieId));
  }

  @Subscription(() => MovieEvent, { name: 'allMoviesEvents' })
  allMoviesEvents() {
    return this.pubSub.asyncIterableIterator<MovieEvent>(ALL_MOVIES_TOPIC);
  }
}
