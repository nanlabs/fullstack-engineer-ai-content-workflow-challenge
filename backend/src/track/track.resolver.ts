// src/track/track.resolver.ts
import { Resolver, Mutation, Args, ID } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException /*, BadRequestException*/ } from '@nestjs/common';
import { Track } from './track.entity';
import { Song } from '../song/song.entity';

@Resolver(() => Track)
export class TrackResolver {
  constructor(
    @InjectRepository(Track) private readonly tracks: Repository<Track>,
    @InjectRepository(Song) private readonly songs: Repository<Song>,
  ) {}

  @Mutation(() => Track, { name: 'setTrackSong' })
  async setTrackSong(
    @Args('trackId', { type: () => ID }) trackId: string,
    @Args('songId', { type: () => ID }) songId: string,
  ): Promise<Track> {
    return this._setSong(trackId, songId);
  }

  private async _setSong(trackId: string, songId: string): Promise<Track> {
    const track = await this.tracks.findOne({ where: { id: trackId } });
    if (!track) throw new NotFoundException('Track not found');

    const song = await this.songs.findOne({ where: { id: songId } });
    if (!song) throw new NotFoundException('Song not found');

    // Si querés permitir reemplazar canción, no lances 400:
    // if (track.song) throw new BadRequestException('Track already has a song');

    track.song = song;
    await this.tracks.save(track);
    return track; // con eager:true, `song` viene hidratado
  }
}
