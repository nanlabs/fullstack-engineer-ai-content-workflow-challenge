import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from './track.entity';
import { Song } from '../song/song.entity';
import { Scene } from '../scene/scene.entity';
import { TrackResolver } from './track.resolver';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../realtime/pubsub.token';

@Module({
  imports: [TypeOrmModule.forFeature([Track, Song, Scene])],
  providers: [
    TrackResolver,
    { provide: PUB_SUB, useFactory: () => new PubSub() },
  ],
  exports: [PUB_SUB],
})
export class TrackModule {}
