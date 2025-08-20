import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from './track.entity';
import { Song } from '../song/song.entity';
import { TrackService } from './track.service';
import { TrackController } from './track.controller';
import { TrackResolver } from './track.resolver';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../realtime/pubsub.token';

@Module({
  imports: [TypeOrmModule.forFeature([Track, Song])],
  controllers: [TrackController],
  providers: [
    TrackService,
    TrackResolver,
    { provide: PUB_SUB, useFactory: () => new PubSub() },
  ],
  exports: [PUB_SUB],
})
export class TrackModule {}
