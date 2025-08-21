import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Args,
  ID,
  Query,
  Resolver,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { Movie, MovieSummary } from './movie.entity';

@Resolver(() => Movie)
export class MovieResolver {
  constructor(
    @InjectRepository(Movie)
    private movieRepository: Repository<Movie>,
  ) {}

  @Query(() => Movie, { nullable: true })
  async movie(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Movie | null> {
    const m = await this.movieRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.scenes', 's')
      .leftJoinAndSelect('s.tracks', 't')
      .leftJoinAndSelect('t.song', 'song')
      .where('m.id = :id', { id })
      .orderBy('s.name', 'ASC')
      .addOrderBy('t.startTime', 'ASC')
      .getOne();

    if (!m) throw new NotFoundException('Movie not found');

    return m as unknown as Movie;
  }

  @Query(() => [Movie])
  async movies(): Promise<Movie[]> {
    return this.movieRepository.find({
      select: { id: true, title: true, description: true },
      relations: {
        scenes: {
          tracks: { song: true },
        },
      },
      order: { title: 'ASC' },
    });
  }

  @ResolveField(() => MovieSummary)
  async summary(@Parent() movie: Movie): Promise<MovieSummary> {
    const qb = this.movieRepository
      .createQueryBuilder('m')
      .leftJoin('m.scenes', 's')
      .leftJoin('s.tracks', 't')
      .where('m.id = :movieId', { movieId: movie.id })
      .select('COUNT(DISTINCT s.id)', 'totalScenes')
      .addSelect('COUNT(DISTINCT t.id)', 'totalTracks')
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.song_id IS NOT NULL THEN 1 ELSE 0 END), 0)`,
        'withSong',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.licenseStatus = :pending THEN 1 ELSE 0 END), 0)`,
        'pending',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.licenseStatus = :negotiation THEN 1 ELSE 0 END), 0)`,
        'negotiation',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.licenseStatus = :approved THEN 1 ELSE 0 END), 0)`,
        'approved',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.licenseStatus = :rejected THEN 1 ELSE 0 END), 0)`,
        'rejected',
      )
      .setParameters({
        pending: 'pending',
        negotiation: 'negotiation',
        approved: 'approved',
        rejected: 'rejected',
      })
      .groupBy('m.id');

    const raw = await qb.getRawOne<{
      totalScenes?: string;
      totalTracks?: string;
      withSong?: string;
      pending?: string;
      negotiation?: string;
      approved?: string;
      rejected?: string;
    }>();

    return {
      totalScenes: Number(raw?.totalScenes ?? 0),
      totalTracks: Number(raw?.totalTracks ?? 0),
      withSong: Number(raw?.withSong ?? 0),
      pending: Number(raw?.pending ?? 0),
      negotiation: Number(raw?.negotiation ?? 0),
      approved: Number(raw?.approved ?? 0),
      rejected: Number(raw?.rejected ?? 0),
    };
  }
}
