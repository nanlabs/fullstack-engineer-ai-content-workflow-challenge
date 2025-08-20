import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { Song } from '../song/song.entity';
import { Movie } from '../movie/movie.entity';
import { Scene } from '../scene/scene.entity';
import { Track } from '../track/track.entity';

export const dataSourceOptions: PostgresConnectionOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [Song, Movie, Scene, Track],
  synchronize: true, // Auto-updates DB schema on app launch (DEV ONLY - disable in production and implement migrations instead!)
};

export default new DataSource(dataSourceOptions);
