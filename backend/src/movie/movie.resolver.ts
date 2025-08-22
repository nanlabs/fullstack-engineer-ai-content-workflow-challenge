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
import { LicenseStatus } from '../track/track.entity';

type MovieSummaryRaw = {
  totalScenes?: string;
  totalTracks?: string;
  withSong?: string;
  pending?: string;
  negotiation?: string;
  approved?: string;
  rejected?: string;
};

@Resolver(() => Movie)
export class MovieResolver {
  constructor(
    @InjectRepository(Movie)
    private movieRepo: Repository<Movie>,
  ) {}

  @Query(() => Movie, { nullable: false })
  async movie(@Args('id', { type: () => ID }) id: string): Promise<Movie> {
    // NOTE: Using QueryBuilder to order nested relations for deterministic UI rendering
    const movie = await this.movieRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.scenes', 's')
      .leftJoinAndSelect('s.tracks', 't')
      .leftJoinAndSelect('t.song', 'song')
      .where('m.id = :id', { id })
      .orderBy('s.name', 'ASC')
      .addOrderBy('t.startTime', 'ASC')
      .getOne();

    if (!movie) throw new NotFoundException('Movie not found');

    return movie;
  }

  @Query(() => [Movie])
  async movies(): Promise<Movie[]> {
    return this.movieRepo.find({
      select: { id: true, title: true, description: true },
      order: { title: 'ASC' },
    });
  }

  @ResolveField(() => MovieSummary)
  async summary(@Parent() movie: Movie): Promise<MovieSummary> {
    const qb = this.movieRepo
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
        pending: LicenseStatus.PENDING,
        negotiation: LicenseStatus.NEGOTIATION,
        approved: LicenseStatus.APPROVED,
        rejected: LicenseStatus.REJECTED,
      })
      .groupBy('m.id');

    const raw = await qb.getRawOne<MovieSummaryRaw>();

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
