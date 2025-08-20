import { Resolver, Mutation, Args, ID, Subscription } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, Inject } from '@nestjs/common';
import { Track, LicenseStatus } from './track.entity';
import { Song } from '../song/song.entity';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../realtime/pubsub.token';

type TrackUpdatedPayload = { trackUpdated: Track };

@Resolver(() => Track)
export class TrackResolver {
  constructor(
    @InjectRepository(Track) private readonly tracks: Repository<Track>,
    @InjectRepository(Song) private readonly songs: Repository<Song>,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Mutation(() => Track, { name: 'setTrackSong' })
  async setTrackSong(
    @Args('trackId', { type: () => ID }) trackId: string,
    @Args('songId', { type: () => ID }) songId: string,
  ): Promise<Track> {
    const track = await this.tracks.findOne({
      where: { id: trackId },
      relations: ['scene', 'scene.movie'],
    });
    if (!track) throw new NotFoundException('Track not found');

    const song = await this.songs.findOne({ where: { id: songId } });
    if (!song) throw new NotFoundException('Song not found');

    track.song = song;
    await this.tracks.save(track);

    await this.pubSub.publish(`trackUpdated:movie-${track.scene.movie.id}`, {
      trackUpdated: track,
    });
    await this.pubSub.publish('movieSummaryChanged', true);

    return track;
  }

  @Mutation(() => Track, { name: 'updateTrackStatus' })
  async updateTrackStatus(
    @Args('trackId', { type: () => ID }) trackId: string,
    @Args('status', { type: () => LicenseStatus }) status: LicenseStatus,
  ): Promise<Track> {
    const track = await this.tracks.findOne({
      where: { id: trackId },
      relations: ['scene', 'scene.movie'],
    });
    if (!track) throw new NotFoundException('Track not found');

    // TODO: Validate allowed state transitions (e.g., PENDING -> NEGOTIATION/APPROVED/REJECTED)
    track.licenseStatus = status;
    await this.tracks.save(track);

    await this.pubSub.publish(`trackUpdated:movie-${track.scene.movie.id}`, {
      trackUpdated: track,
    });
    await this.pubSub.publish('movieSummaryChanged', true);

    return track;
  }

  @Subscription(() => Track, {
    name: 'trackUpdated',
    resolve: async function (
      this: TrackResolver,
      payload: TrackUpdatedPayload,
    ): Promise<Track> {
      const full = await this.tracks.findOne({
        where: { id: payload.trackUpdated.id },
        relations: ['song', 'scene', 'scene.movie'],
      });

      if (!full) throw new NotFoundException('Track not found');
      return full;
    },
  })
  trackUpdated(@Args('movieId', { type: () => ID }) movieId: string) {
    return this.pubSub.asyncIterableIterator<TrackUpdatedPayload>(
      `trackUpdated:movie-${movieId}`,
    );
  }

  @Subscription(() => Boolean, {
    name: 'movieSummaryChanged',
    resolve: () => true,
  })
  movieSummaryChanged() {
    return this.pubSub.asyncIterableIterator('movieSummaryChanged');
  }
}
