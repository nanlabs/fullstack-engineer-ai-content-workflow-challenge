import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SongModule } from './song/song.module';
import { TrackModule } from './track/track.module';
import { SceneModule } from './scene/scene.module';
import { MovieModule } from './movie/movie.module';
import { dataSourceOptions } from './database/data-source';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true, // only for dev
      sortSchema: true,
      subscriptions: {
        'graphql-ws': true,
      },
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    SongModule,
    TrackModule,
    SceneModule,
    MovieModule,
    RealtimeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
