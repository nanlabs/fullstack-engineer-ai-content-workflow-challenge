import { PubSub } from 'graphql-subscriptions';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import {
  Resolver,
  Mutation,
  Args,
  ID,
  InputType,
  Field,
  Int,
} from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Track, LicenseStatus } from './track.entity';
import { Song } from 'src/song/song.entity';
import { Scene } from 'src/scene/scene.entity';
import { PUB_SUB } from 'src/realtime/pubsub.token';
import {
  MovieEventKind,
  emitMovieEvent,
  emitGlobalMoviesEvent,
} from 'src/realtime/events';

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
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    @InjectRepository(Song) private readonly songRepo: Repository<Song>,
    @InjectRepository(Scene) private readonly sceneRepo: Repository<Scene>,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Mutation(() => Track)
  async setTrackSong(
    @Args('trackId', { type: () => ID }) trackId: string,
    @Args('songId', { type: () => ID }) songId: string,
  ): Promise<Track> {
    const track = await this.trackRepo.findOne({
      where: { id: trackId },
      relations: ['scene', 'scene.movie'],
    });
    if (!track) throw new NotFoundException('Track not found');

    const song = await this.songRepo.findOne({ where: { id: songId } });
    if (!song) throw new NotFoundException('Song not found');

    track.song = song;
    await this.trackRepo.save(track);

    // --- Emit real-time updates ---
    await emitMovieEvent(
      this.pubSub,
      track.scene.movie.id,
      MovieEventKind.TRACK_SONG_SET,
    );
    await emitGlobalMoviesEvent(
      this.pubSub,
      track.scene.movie.title,
      MovieEventKind.TRACK_SONG_SET,
    );

    return track;
  }

  @Mutation(() => Track)
  async updateTrackStatus(
    @Args('trackId', { type: () => ID }) trackId: string,
    @Args('status', { type: () => LicenseStatus }) status: LicenseStatus,
  ): Promise<Track> {
    const track = await this.trackRepo.findOne({
      where: { id: trackId },
      relations: ['scene', 'scene.movie'],
    });
    if (!track) throw new NotFoundException('Track not found');

    // TODO: Validate allowed state transitions (e.g., PENDING -> NEGOTIATION/APPROVED/REJECTED)
    track.licenseStatus = status;
    await this.trackRepo.save(track);

    // --- Emit real-time updates ---
    await emitMovieEvent(
      this.pubSub,
      track.scene.movie.id,
      MovieEventKind.TRACK_STATUS_UPDATED,
    );
    await emitGlobalMoviesEvent(
      this.pubSub,
      track.scene.movie.title,
      MovieEventKind.TRACK_STATUS_UPDATED,
    );

    return track;
  }

  @Mutation(() => Track)
  async createTrack(@Args('input') input: CreateTrackInput): Promise<Track> {
    const { sceneId, startTime, endTime } = input;

    // --- Basic validation ---
    if (startTime < 0 || endTime <= startTime) {
      throw new BadRequestException(
        'Invalid time range: ensure 0 <= startTime < endTime',
      );
    }

    const scene = await this.sceneRepo.findOne({
      where: { id: sceneId },
      relations: ['movie'],
    });
    if (!scene) throw new NotFoundException('Scene not found');

    // --- Detect overlaps within same scene (simple check) ---
    const overlaps = await this.trackRepo.count({
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

    const track = this.trackRepo.create({
      scene,
      startTime,
      endTime,
      licenseStatus: LicenseStatus.PENDING,
    });

    const saved = await this.trackRepo.save(track);

    // --- Emit real-time updates ---
    await emitMovieEvent(
      this.pubSub,
      track.scene.movie.id,
      MovieEventKind.TRACK_CREATED,
    );
    await emitGlobalMoviesEvent(
      this.pubSub,
      track.scene.movie.title,
      MovieEventKind.TRACK_CREATED,
    );

    return saved;
  }
}
