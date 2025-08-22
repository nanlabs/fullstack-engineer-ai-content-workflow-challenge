import { Resolver, Query } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from './song.entity';

@Resolver(() => Song)
export class SongResolver {
  constructor(
    @InjectRepository(Song) private readonly songRepo: Repository<Song>,
  ) {}

  @Query(() => [Song])
  songs(): Promise<Song[]> {
    return this.songRepo.find({ order: { title: 'ASC', artist: 'ASC' } });
  }
}
