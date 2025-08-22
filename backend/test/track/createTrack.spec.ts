import { PubSub } from 'graphql-subscriptions';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TrackResolver } from '../../src/track/track.resolver';
import { Track, LicenseStatus } from '../../src/track/track.entity';
import { Scene } from '../../src/scene/scene.entity';
import { Movie } from '../../src/movie/movie.entity';
import { Song } from '../../src/song/song.entity';
import { PUB_SUB } from '../../src/realtime/pubsub.token';
import {
  emitMovieEvent,
  emitGlobalMoviesEvent,
  MovieEventKind,
} from '../../src/realtime/events';

jest.mock('../../src/realtime/events', () => ({
  MovieEventKind: {
    TRACK_CREATED: 'TRACK_CREATED',
  },
  emitMovieEvent: jest.fn().mockResolvedValue(undefined),
  emitGlobalMoviesEvent: jest.fn().mockResolvedValue(undefined),
}));

type RepoMock<T> = {
  findOne?: jest.Mock<Promise<T | null>, [any]>;
  save?: jest.Mock<Promise<T>, [T]>;
  count?: jest.Mock<Promise<number>, [any]>;
  create?: jest.Mock<T, [Partial<T>]>;
};

describe('TrackResolver.createTrack (unit)', () => {
  let resolver: TrackResolver;
  let pubSub: PubSub;

  let trackRepo: RepoMock<Track>;
  let songRepo: RepoMock<Song>;
  let sceneRepo: RepoMock<Scene>;

  beforeEach(async () => {
    trackRepo = {
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    sceneRepo = {
      findOne: jest.fn(),
    };
    songRepo = {
      // no-op
    };

    pubSub = {
      publish: jest.fn(),
      asyncIterator: jest.fn(),
    } as unknown as PubSub;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackResolver,
        { provide: getRepositoryToken(Track), useValue: trackRepo },
        { provide: getRepositoryToken(Scene), useValue: sceneRepo },
        { provide: getRepositoryToken(Song), useValue: songRepo },
        { provide: PUB_SUB, useValue: pubSub },
      ],
    }).compile();

    resolver = module.get<TrackResolver>(TrackResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a track and emits TRACK_CREATED (happy path)', async () => {
    // Arrange
    const movie: Partial<Movie> = { id: 'm1', title: 'Movie A' };
    const scene: Partial<Scene> = { id: 'sc1', movie: movie as Movie };

    (sceneRepo.findOne as jest.Mock).mockResolvedValue(scene as Scene);
    (trackRepo.count as jest.Mock).mockResolvedValue(0);

    // `create` returns a new entity (no id yet)
    (trackRepo.create as jest.Mock).mockImplementation(
      (partial: Partial<Track>) =>
        ({
          ...partial,
        }) as Track,
    );

    // `save` returns the entity with an id (simulate persistence)
    (trackRepo.save as jest.Mock).mockImplementation((t: Track) =>
      Promise.resolve({
        ...t,
        id: 't1',
      }),
    );

    // Act
    const created = await resolver.createTrack({
      sceneId: 'sc1',
      startTime: 10,
      endTime: 20,
    });

    // Assert entity properties
    expect(created.id).toBe('t1');
    expect(created.scene.id).toBe(scene.id);
    expect(created.startTime).toBe(10);
    expect(created.endTime).toBe(20);
    expect(created.licenseStatus).toBe(LicenseStatus.PENDING);

    // Assert repo calls
    expect(sceneRepo.findOne).toHaveBeenCalledWith({
      where: { id: scene.id },
      relations: ['movie'],
    });
    expect(trackRepo.count).toHaveBeenCalledTimes(1);
    expect(trackRepo.create).toHaveBeenCalledWith({
      scene: scene,
      startTime: 10,
      endTime: 20,
      licenseStatus: LicenseStatus.PENDING,
    });
    expect(trackRepo.save).toHaveBeenCalledTimes(1);

    // Assert real-time events
    expect(emitMovieEvent).toHaveBeenCalledWith(
      pubSub,
      movie.id,
      MovieEventKind.TRACK_CREATED,
    );
    expect(emitGlobalMoviesEvent).toHaveBeenCalledWith(
      pubSub,
      movie.title,
      MovieEventKind.TRACK_CREATED,
    );
  });

  it('throws BadRequestException when startTime < 0', async () => {
    await expect(
      resolver.createTrack({ sceneId: 'sc1', startTime: -1, endTime: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(sceneRepo.findOne).not.toHaveBeenCalled();
    expect(trackRepo.count).not.toHaveBeenCalled();
    expect(trackRepo.save).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when endTime <= startTime', async () => {
    await expect(
      resolver.createTrack({ sceneId: 'sc1', startTime: 10, endTime: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      resolver.createTrack({ sceneId: 'sc1', startTime: 10, endTime: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(sceneRepo.findOne).not.toHaveBeenCalled();
    expect(trackRepo.count).not.toHaveBeenCalled();
    expect(trackRepo.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when scene does not exist', async () => {
    (sceneRepo.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      resolver.createTrack({ sceneId: 'missing', startTime: 0, endTime: 5 }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(trackRepo.count).not.toHaveBeenCalled();
    expect(trackRepo.save).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when overlapping tracks exist', async () => {
    const movie: Partial<Movie> = { id: 'm1', title: 'Movie A' };
    const scene: Partial<Scene> = { id: 'sc1', movie: movie as Movie };

    (sceneRepo.findOne as jest.Mock).mockResolvedValue(scene as Scene);
    (trackRepo.count as jest.Mock).mockResolvedValue(2);

    await expect(
      resolver.createTrack({ sceneId: scene.id!, startTime: 10, endTime: 20 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(trackRepo.save).not.toHaveBeenCalled();
    expect(emitMovieEvent).not.toHaveBeenCalled();
    expect(emitGlobalMoviesEvent).not.toHaveBeenCalled();
  });
});
