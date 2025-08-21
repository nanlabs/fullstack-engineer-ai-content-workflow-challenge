import { PubSub } from 'graphql-subscriptions';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TrackResolver } from '../../src/track/track.resolver';
import { Track, LicenseStatus } from '../../src/track/track.entity';
import { Song } from '../../src/song/song.entity';
import { Scene } from '../../src/scene/scene.entity';
import { Movie } from '../../src/movie/movie.entity';
import { PUB_SUB } from '../../src/realtime/pubsub.token';
import {
  emitMovieEvent,
  emitGlobalMoviesEvent,
  MovieEventKind,
} from '../../src/realtime/events';

jest.mock('../../src/realtime/events', () => ({
  MovieEventKind: {
    TRACK_STATUS_UPDATED: 'TRACK_STATUS_UPDATED',
  },
  emitMovieEvent: jest.fn().mockResolvedValue(undefined),
  emitGlobalMoviesEvent: jest.fn().mockResolvedValue(undefined),
}));

type RepoMock<T> = {
  findOne: jest.Mock<Promise<T | null>, [any]>;
  save: jest.Mock<Promise<T>, [T]>;
};

describe('TrackResolver.updateTrackStatus (unit)', () => {
  let resolver: TrackResolver;
  let pubSub: PubSub;
  let trackRepo: RepoMock<Track>;
  let songRepo: RepoMock<Song>;
  let sceneRepo: RepoMock<Scene>;

  beforeEach(async () => {
    trackRepo = {
      findOne: jest.fn<Promise<Track | null>, [any]>(),
      save: jest.fn<Promise<Track>, [Track]>(),
    };

    songRepo = {
      findOne: jest.fn<Promise<Song | null>, [any]>(),
      save: jest.fn<Promise<Song>, [Song]>(),
    };

    sceneRepo = {
      findOne: jest.fn<Promise<Scene | null>, [any]>(),
      save: jest.fn<Promise<Scene>, [Scene]>(),
    };

    pubSub = {
      publish: jest.fn(),
      asyncIterator: jest.fn(),
    } as unknown as PubSub;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackResolver,
        { provide: getRepositoryToken(Track), useValue: trackRepo },
        { provide: getRepositoryToken(Song), useValue: songRepo },
        { provide: getRepositoryToken(Scene), useValue: sceneRepo },
        { provide: PUB_SUB, useValue: pubSub },
      ],
    }).compile();

    resolver = module.get<TrackResolver>(TrackResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates the status of a track and emits TRACK_STATUS_UPDATED (happy path)', async () => {
    // Arrange
    const movie: Partial<Movie> = { id: 'm1', title: 'Movie A' };
    const scene: Partial<Scene> = { id: 'sc1', movie: movie as Movie };
    const track: Partial<Track> = {
      id: 't1',
      scene: scene as Scene,
      licenseStatus: LicenseStatus.PENDING,
    };

    (trackRepo.findOne as jest.Mock).mockResolvedValue(track as Track);
    (trackRepo.save as jest.Mock).mockImplementation((t: Track) =>
      Promise.resolve(t),
    );

    // Act
    const updated = await resolver.updateTrackStatus(
      track.id!,
      LicenseStatus.APPROVED,
    );

    // Assert entity changes
    expect(updated.licenseStatus).toBe(LicenseStatus.APPROVED);

    // Assert repo calls (stronger guarantees)
    expect(trackRepo.findOne).toHaveBeenCalledWith({
      where: { id: track.id },
      relations: ['scene', 'scene.movie'],
    });
    expect(trackRepo.save).toHaveBeenCalledTimes(1);
    expect(trackRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ licenseStatus: LicenseStatus.APPROVED }),
    );

    // Realtime notifications
    expect(emitMovieEvent).toHaveBeenCalledWith(
      pubSub,
      'm1',
      MovieEventKind.TRACK_STATUS_UPDATED,
    );
    expect(emitGlobalMoviesEvent).toHaveBeenCalledWith(
      pubSub,
      'Movie A',
      MovieEventKind.TRACK_STATUS_UPDATED,
    );
  });

  it('throws NotFoundException when track does not exist', async () => {
    (trackRepo.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      resolver.updateTrackStatus('missing-track', LicenseStatus.REJECTED),
    ).rejects.toBeInstanceOf(NotFoundException);

    // Should not try to save nor emit events
    expect(trackRepo.save).not.toHaveBeenCalled();
    expect(emitMovieEvent).not.toHaveBeenCalled();
    expect(emitGlobalMoviesEvent).not.toHaveBeenCalled();
  });
});
