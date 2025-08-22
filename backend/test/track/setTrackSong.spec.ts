import { PubSub } from 'graphql-subscriptions';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TrackResolver } from '../../src/track/track.resolver';
import { Track } from '../../src/track/track.entity';
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
    TRACK_SONG_SET: 'TRACK_SONG_SET',
  },
  emitMovieEvent: jest.fn().mockResolvedValue(undefined),
  emitGlobalMoviesEvent: jest.fn().mockResolvedValue(undefined),
}));

type RepoMock<T> = {
  findOne?: jest.Mock<Promise<T | null>, [any]>;
  save?: jest.Mock<Promise<T>, [T]>;
};

describe('TrackResolver.setTrackSong (unit)', () => {
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
    };

    sceneRepo = {
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

  it('sets the song on a track and emits TRACK_SONG_SET (happy path)', async () => {
    // Arrange
    const movie: Partial<Movie> = { id: 'm1', title: 'Movie A' };
    const scene: Partial<Scene> = { id: 'sc1', movie: movie as Movie };
    const track: Partial<Track> = {
      id: 't1',
      scene: scene as Scene,
      song: null,
    };
    const song: Partial<Song> = { id: 's1', title: 'Song X' };

    (trackRepo.findOne as jest.Mock).mockResolvedValue(track as Track);
    (songRepo.findOne as jest.Mock).mockResolvedValue(song as Song);
    (trackRepo.save as jest.Mock).mockImplementation((t: Track) =>
      Promise.resolve(t),
    );

    // Act
    const updated = await resolver.setTrackSong(track.id!, song.id!);

    // Assert entity updated
    expect(updated.song?.id).toBe(song.id!);

    // Assert repo calls and requested relations
    expect(trackRepo.findOne).toHaveBeenCalledWith({
      where: { id: track.id },
      relations: ['scene', 'scene.movie'],
    });
    expect(trackRepo.save).toHaveBeenCalledTimes(1);
    const [saved] = trackRepo.save.mock.lastCall!;
    expect(saved.song?.id).toBe(song.id);

    // Realtime notifications
    expect(emitMovieEvent).toHaveBeenCalledWith(
      pubSub,
      movie.id,
      MovieEventKind.TRACK_SONG_SET,
    );
    expect(emitGlobalMoviesEvent).toHaveBeenCalledWith(
      pubSub,
      movie.title,
      MovieEventKind.TRACK_SONG_SET,
    );
  });

  it('throws NotFoundException when track does not exist', async () => {
    (trackRepo.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      resolver.setTrackSong('missing-track', 'random-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(emitMovieEvent).not.toHaveBeenCalled();
    expect(emitGlobalMoviesEvent).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when song does not exist', async () => {
    const movie: Partial<Movie> = { id: 'm1', title: 'Movie A' };
    const scene: Partial<Scene> = { id: 'sc1', movie: movie as Movie };
    const track: Partial<Track> = { id: 't1', scene: scene as Scene };

    await expect(
      resolver.setTrackSong(track.id!, 'missing-song'),
    ).rejects.toBeInstanceOf(NotFoundException);

    // Should not try to save nor emit events
    expect(trackRepo.save).not.toHaveBeenCalled();
    expect(emitMovieEvent).not.toHaveBeenCalled();
    expect(emitGlobalMoviesEvent).not.toHaveBeenCalled();
  });
});
