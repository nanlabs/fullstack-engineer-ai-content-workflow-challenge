import { Resolver, Mutation, Args, ID } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Track, LicenseStatus } from './track.entity';
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
    return this.setSong(trackId, songId);
  }

  private async setSong(trackId: string, songId: string): Promise<Track> {
    const track = await this.tracks.findOne({ where: { id: trackId } });
    if (!track) throw new NotFoundException('Track not found');

    const song = await this.songs.findOne({ where: { id: songId } });
    if (!song) throw new NotFoundException('Song not found');

    track.song = song;
    await this.tracks.save(track);
    return track;
  }

  @Mutation(() => Track, { name: 'updateTrackStatus' })
  async updateTrackStatus(
    @Args('trackId', { type: () => ID }) trackId: string,
    @Args('status', { type: () => LicenseStatus }) status: LicenseStatus,
  ): Promise<Track> {
    const track = await this.tracks.findOne({ where: { id: trackId } });
    if (!track) throw new NotFoundException('Track not found');

    // TODO: Validate allowed state transitions (e.g., PENDING -> NEGOTIATION/APPROVED/REJECTED)

    track.licenseStatus = status;
    await this.tracks.save(track);
    return track;
  }
}
