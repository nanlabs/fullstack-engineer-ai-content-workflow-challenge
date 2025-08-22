import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { Song } from '../../song/song.entity';

export class SongSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(Song);

    await repo.insert([
      // ===================================================
      // ⚠️ Protected songs — DO NOT remove or modify
      // Used by UI tests (labels rendered as "Title — Artist")
      // ===================================================
      {
        title: 'Time',
        artist: 'Hans Zimmer',
        duration: 287,
        // IMPORTANT: UI tests assert presence and label formatting.
      },
      {
        title: 'Why So Serious?',
        artist: 'Hans Zimmer & James Newton Howard',
        duration: 537,
        // IMPORTANT: Seeded for demo and list assertions; keep consistent.
      },
      {
        title: 'Non, Je Ne Regrette Rien',
        artist: 'Édith Piaf',
        duration: 140,
        // IMPORTANT: Used in Inception/Truck Flip seeded state.
      },

      // ===================================================
      // Demo songs — safe to change/extend
      // ===================================================
      {
        title: 'Cornfield Chase',
        artist: 'Hans Zimmer',
        duration: 130,
      },
      {
        title: 'Clubbed to Death',
        artist: 'Rob Dougan',
        duration: 448,
      },
      {
        title: 'Welcome to the Citadel',
        artist: 'Junkie XL',
        duration: 215,
      },
      {
        title: 'Adrenaline Rush',
        artist: 'John Murphy',
        duration: 210,
      },
    ]);
  }
}
