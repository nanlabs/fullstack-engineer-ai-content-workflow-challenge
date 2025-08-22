import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from './track.entity';
import { Song } from '../song/song.entity';
import { Scene } from '../scene/scene.entity';
import { TrackResolver } from './track.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Track, Song, Scene])],
  providers: [TrackResolver],
})
export class TrackModule {}
