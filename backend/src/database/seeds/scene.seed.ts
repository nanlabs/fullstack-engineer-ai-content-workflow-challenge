import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { Scene } from '../../scene/scene.entity';
import { Movie } from '../../movie/movie.entity';

export class SceneSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const movieRepo = dataSource.getRepository(Movie);
    const movies = await movieRepo.find();

    await dataSource.getRepository(Scene).insert([
      {
        name: 'Dream Within a Dream',
        description: 'Cobb explains dream-sharing rules',
        movie: movies.find((m) => m.title === 'Inception'),
      },
      {
        name: 'Truck Flip',
        description: 'The iconic rotating hallway fight',
        movie: movies.find((m) => m.title === 'Inception'),
      },
      {
        name: 'Bank Heist',
        description: "Joker's chaotic robbery sequence",
        movie: movies.find((m) => m.title === 'The Dark Knight'),
      },
    ]);
  }
}
