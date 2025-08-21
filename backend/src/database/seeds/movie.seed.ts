import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { Movie } from '../../movie/movie.entity';

export class MovieSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    await dataSource.getRepository(Movie).insert([
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Inception',
        description:
          'A thief who steals corporate secrets through dream-sharing technology',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        title: 'The Dark Knight',
        description:
          'When the menace known as the Joker emerges, Batman must confront chaos',
      },
    ]);
  }
}
