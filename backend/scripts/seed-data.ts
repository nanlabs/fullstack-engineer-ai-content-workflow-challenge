import { DataSource } from 'typeorm';
import { MovieSeeder } from '../src/database/seeds/movie.seed';
import { SceneSeeder } from '../src/database/seeds/scene.seed';
import { SongSeeder } from '../src/database/seeds/song.seed';
import { TrackSeeder } from '../src/database/seeds/track.seed';
import { dataSourceOptions } from '../src/database/data-source';

async function runSeeders() {
  const dataSource = new DataSource({
    ...dataSourceOptions,
    logging: ['error', 'warn'], // Show only important logs
  });

  try {
    await dataSource.initialize();
    console.log('🚀 Database connection established');

    // Execute seeders in proper order
    await new SongSeeder().run(dataSource);
    console.log('🎵 Songs seeded');

    await new MovieSeeder().run(dataSource);
    console.log('🎬 Movies seeded');

    await new SceneSeeder().run(dataSource);
    console.log('🎭 Scenes seeded');

    await new TrackSeeder().run(dataSource);
    console.log('🔊 Tracks seeded');

    console.log('✅ All seeders completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

runSeeders();
