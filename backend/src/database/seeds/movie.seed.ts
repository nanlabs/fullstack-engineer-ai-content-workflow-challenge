import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { Movie } from '../../movie/movie.entity';

export class MovieSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    await dataSource.getRepository(Movie).insert([
      {
        title: 'Inception',
        description:
          'A thief who steals corporate secrets through dream-sharing technology',
      },
      {
        title: 'The Dark Knight',
        description:
          'When the menace known as the Joker emerges, Batman must confront chaos',
      },
    ]);
  }
}
