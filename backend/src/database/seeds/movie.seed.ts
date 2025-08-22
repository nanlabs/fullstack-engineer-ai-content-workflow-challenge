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
          '⚠️ Do not modify or delete this if you want the ui-tests to pass.', // UI tests depend on this movie's ID and title.
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        title: 'The Dark Knight',
        description:
          '⚠️ Do not modify or delete this if you want the ui-tests to pass.', // UI tests depend on this movie's ID and title.
      },
      {
        title: 'Interstellar',
        description: `Explorers travel through a wormhole in space in an attempt to ensure humanity's survival.`,
      },
      {
        title: 'The Matrix',
        description:
          'A hacker discovers the true nature of his reality and his role in the war against its controllers.',
      },
      {
        title: 'Mad Max: Fury Road',
        description:
          'In a post-apocalyptic wasteland, Max teams up with Furiosa to flee a tyrant.',
      },
    ]);
  }
}
