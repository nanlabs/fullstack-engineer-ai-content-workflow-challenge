import {
  Resolver,
  Mutation,
  Args,
  ID,
  Subscription,
  InputType,
  Field,
  Int,
} from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { Track, LicenseStatus } from './track.entity';
import { Song } from '../song/song.entity';
import { Scene } from '../scene/scene.entity';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../realtime/pubsub.token';

type TrackUpdatedPayload = { trackUpdated: Track };

@InputType()
class CreateTrackInput {
  @Field(() => ID)
  sceneId!: string;

  @Field(() => Int)
  startTime!: number;

  @Field(() => Int)
  endTime!: number;
}

@Resolver(() => Track)
export class TrackResolver {
  constructor(
    @InjectRepository(Track) private readonly tracks: Repository<Track>,
    @InjectRepository(Song) private readonly songs: Repository<Song>,
    @InjectRepository(Scene) private readonly scenes: Repository<Scene>,
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

  @Mutation(() => Track, { name: 'createTrack' })
  async createTrack(@Args('input') input: CreateTrackInput): Promise<Track> {
    const { sceneId, startTime, endTime } = input;

    // --- Basic validation ---
    if (startTime < 0 || endTime <= startTime) {
      throw new BadRequestException(
        'Invalid time range: ensure 0 <= startTime < endTime',
      );
    }

    const scene = await this.scenes.findOne({
      where: { id: sceneId },
      relations: ['movie'],
    });
    if (!scene) throw new NotFoundException('Scene not found');

    // --- Detect overlaps within same scene (simple check) ---
    const overlaps = await this.tracks.count({
      where: {
        scene: { id: sceneId },
        // overlap condition: NOT (end <= start OR start >= end)
        // -> start < end AND end > start
        startTime: LessThan(endTime),
        endTime: MoreThan(startTime),
      },
    });

    if (overlaps > 0) {
      // NOTE: Business rule depends on product: check if we should reject or allow.
      throw new BadRequestException('Overlapping track in this scene');
    }

    const track = this.tracks.create({
      scene,
      startTime,
      endTime,
      licenseStatus: LicenseStatus.PENDING,
    });

    const saved = await this.tracks.save(track);

    // --- Emit real-time updates ---
    await this.pubSub.publish(`trackUpdated:movie-${scene.movie.id}`, {
      trackUpdated: saved,
    });
    await this.pubSub.publish('movieSummaryChanged', true);

    return saved;
  }
}
