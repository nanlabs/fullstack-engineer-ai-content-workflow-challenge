import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SongModule } from './song/song.module';
import { TrackModule } from './track/track.module';
import { SceneModule } from './scene/scene.module';
import { MovieModule } from './movie/movie.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost', // In production/stage, use env vars (e.g., process.env.DB_HOST)
      port: 5432, // In production/stage, use env vars (e.g., process.env.DB_PORT)
      username: 'postgres', // In production/stage, use env vars (e.g., process.env.DB_USER)
      password: 'postgres', // In production/stage, use env vars (e.g., process.env.DB_PASSWORD)
      database: 'music_licensing', // In production/stage, use env vars (e.g., process.env.DB_NAME)
      entities: ['dist/**/*.entity.js'], // Points to compiled JS entities (for runtime)
      synchronize: true, // Auto-updates DB schema on app launch (DEV ONLY - disable in production and implement migrations instead!)
    }),
    SongModule,
    TrackModule,
    SceneModule,
    MovieModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
