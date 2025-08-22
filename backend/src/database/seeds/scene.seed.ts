import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { Scene } from '../../scene/scene.entity';
import { Movie } from '../../movie/movie.entity';

export class SceneSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const movieRepo = dataSource.getRepository(Movie);
    const sceneRepo = dataSource.getRepository(Scene);

    const movies = await movieRepo.find();

    // Helper to get a movie by title or fail fast (keeps seeds consistent)
    const mustGet = (title: string) => {
      const m = movies.find((x) => x.title === title);
      if (!m)
        throw new Error(`Seed invariant failed: movie "${title}" not found`);
      return m;
    };

    await sceneRepo.insert([
      // --- Inception ---
      // Referenced by UI tests (movie detail).
      {
        name: 'Truck Flip',
        description:
          '⚠️ Do not modify or delete this if you want the ui-tests to pass.',
        movie: mustGet('Inception'),
      },
      // Referenced by UI tests (movie detail).
      {
        name: 'Dream Within a Dream',
        description:
          '⚠️ Do not modify or delete this if you want the ui-tests to pass.',
        movie: mustGet('Inception'),
      },

      // --- The Dark Knight ---
      {
        name: 'Bank Heist',
        description: "Joker's chaotic robbery sequence",
        movie: mustGet('The Dark Knight'),
      },

      // --- Interstellar ---
      {
        name: 'Docking Maneuver',
        description:
          'Cooper attempts a risky docking with the spinning Endurance.',
        movie: mustGet('Interstellar'),
      },
      {
        name: 'Tesseract',
        description: 'Cooper communicates through time in the tesseract.',
        movie: mustGet('Interstellar'),
      },

      // --- The Matrix ---
      {
        name: 'Lobby Shootout',
        description: 'Neo and Trinity storm the lobby to rescue Morpheus.',
        movie: mustGet('The Matrix'),
      },
      {
        name: 'Bullet Time Rooftop',
        description: 'Neo dodges bullets on the rooftop.',
        movie: mustGet('The Matrix'),
      },

      // --- Mad Max: Fury Road ---
      {
        name: 'Sandstorm Chase',
        description: 'War rig plunges into a colossal sandstorm.',
        movie: mustGet('Mad Max: Fury Road'),
      },
      {
        name: 'Doof Warrior',
        description: 'Guitar flamethrower madness on the rolling stage.',
        movie: mustGet('Mad Max: Fury Road'),
      },
    ]);
  }
}
