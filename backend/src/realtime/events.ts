import {
  ObjectType,
  Field,
  registerEnumType,
  GraphQLISODateTime,
} from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';

export const movieTopic = (movieId: string) => `movie:${movieId}`;
export const ALL_MOVIES_TOPIC = 'movies:all';
export enum MovieEventKind {
  TRACK_CREATED = 'TRACK_CREATED',
  TRACK_STATUS_UPDATED = 'TRACK_STATUS_UPDATED',
  TRACK_SONG_SET = 'TRACK_SONG_SET',
  SCENE_CREATED = 'SCENE_CREATED',
}
registerEnumType(MovieEventKind, { name: 'MovieEventKind' });

@ObjectType()
export class MovieEvent {
  @Field(() => MovieEventKind)
  kind!: MovieEventKind;

  @Field(() => GraphQLISODateTime)
  at!: Date;
}
export async function emitMovieEvent(
  pubSub: PubSub,
  movieId: string,
  kind: MovieEventKind,
  at: Date = new Date(),
) {
  return pubSub.publish(movieTopic(movieId), {
    movieEvents: { kind, at },
  });
}

export async function emitGlobalMoviesEvent(
  pubSub: PubSub,
  movieTitle: string,
  kind: MovieEventKind,
  at: Date = new Date(),
) {
  return pubSub.publish(ALL_MOVIES_TOPIC, {
    allMoviesEvents: { kind, at, movieTitle },
  });
}
