import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from './track.entity';
import { Song } from '../song/song.entity';
import { TrackService } from './track.service';
import { TrackController } from './track.controller';
import { TrackResolver } from './track.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Track, Song])],
  controllers: [TrackController],
  providers: [TrackService, TrackResolver],
})
export class TrackModule {}
