import { Resolver, Query } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from './song.entity';

@Resolver(() => Song)
export class SongResolver {
  constructor(
    @InjectRepository(Song) private readonly songRepository: Repository<Song>,
  ) {}

  @Query(() => [Song], { name: 'songs' })
  findAll(): Promise<Song[]> {
    return this.songRepository.find({ order: { title: 'ASC', artist: 'ASC' } });
  }
}
