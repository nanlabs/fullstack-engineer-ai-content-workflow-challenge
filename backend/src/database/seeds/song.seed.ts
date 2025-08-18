import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { Song } from '../../song/song.entity';

export class SongSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    await dataSource.getRepository(Song).insert([
      {
        title: 'Time',
        artist: 'Hans Zimmer',
        duration: 287,
      },
      {
        title: 'Why So Serious?',
        artist: 'Hans Zimmer & James Newton Howard',
        duration: 537,
      },
      {
        title: 'Non, Je Ne Regrette Rien',
        artist: 'Édith Piaf',
        duration: 140,
      },
    ]);
  }
}
