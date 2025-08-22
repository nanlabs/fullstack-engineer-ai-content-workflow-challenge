import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { Track, LicenseStatus } from '../../track/track.entity';
import { Scene } from '../../scene/scene.entity';
import { Song } from '../../song/song.entity';

export class TrackSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const sceneRepo = dataSource.getRepository(Scene);
    const songRepo = dataSource.getRepository(Song);
    const trackRepo = dataSource.getRepository(Track);

    const scenes = await sceneRepo.find({ relations: ['movie'] });
    const songs = await songRepo.find();

    const findScene = (movieTitle: string, sceneName: string) =>
      scenes.find((s) => s.movie?.title === movieTitle && s.name === sceneName);

    const findSong = (title: string) => songs.find((s) => s.title === title);

    // ===================================================
    // ⚠️ Protected tracks — DO NOT remove or modify
    // ===================================================
    const protectedTracks: Partial<Track>[] = [
      {
        startTime: 0,
        endTime: 120,
        licenseStatus: LicenseStatus.APPROVED,
        scene: findScene('Inception', 'Dream Within a Dream'),
        song: findSong('Time'),
        // IMPORTANT: Used in UI test for "Change status".
      },
      {
        startTime: 30,
        endTime: 90,
        licenseStatus: LicenseStatus.PENDING,
        scene: findScene('Inception', 'Truck Flip'),
        // no song assigned
        // IMPORTANT: Used in UI test for "Associate song".
      },
      {
        startTime: 60,
        endTime: 180,
        licenseStatus: LicenseStatus.APPROVED,
        scene: findScene('Inception', 'Truck Flip'),
        song: findSong('Non, Je Ne Regrette Rien'),
        // IMPORTANT: Validates state consistency in UI tests.
      },
    ];

    // ===================================================
    // Demo tracks — safe to change/extend
    // ===================================================
    const demoTracks: Partial<Track>[] = [
      // The Dark Knight
      {
        startTime: 45,
        endTime: 180,
        licenseStatus: LicenseStatus.NEGOTIATION,
        scene: findScene('The Dark Knight', 'Bank Heist'),
        song: findSong('Why So Serious?'),
        // Demo only, not used by UI tests.
      },
      {
        startTime: 10,
        endTime: 50,
        licenseStatus: LicenseStatus.PENDING,
        scene: findScene('The Dark Knight', 'Bank Heist'),
        // another empty track for manual testing
      },

      // Interstellar
      {
        startTime: 10,
        endTime: 120,
        licenseStatus: LicenseStatus.NEGOTIATION,
        scene: findScene('Interstellar', 'Docking Maneuver'),
        song: findSong('Cornfield Chase'),
      },
      {
        startTime: 60,
        endTime: 150,
        licenseStatus: LicenseStatus.PENDING,
        scene: findScene('Interstellar', 'Tesseract'),
        // empty track
      },

      // The Matrix
      {
        startTime: 5,
        endTime: 90,
        licenseStatus: LicenseStatus.APPROVED,
        scene: findScene('The Matrix', 'Lobby Shootout'),
        song: findSong('Clubbed to Death'),
      },
      {
        startTime: 30,
        endTime: 120,
        licenseStatus: LicenseStatus.PENDING,
        scene: findScene('The Matrix', 'Bullet Time Rooftop'),
      },

      // Mad Max: Fury Road
      {
        startTime: 20,
        endTime: 110,
        licenseStatus: LicenseStatus.APPROVED,
        scene: findScene('Mad Max: Fury Road', 'Doof Warrior'),
        song: findSong('Welcome to the Citadel'),
      },
      {
        startTime: 15,
        endTime: 95,
        licenseStatus: LicenseStatus.PENDING,
        scene: findScene('Mad Max: Fury Road', 'Sandstorm Chase'),
      },
      {
        startTime: 100,
        endTime: 180,
        licenseStatus: LicenseStatus.NEGOTIATION,
        scene: findScene('Mad Max: Fury Road', 'Sandstorm Chase'),
        song: findSong('Adrenaline Rush'),
      },
    ];

    const allTracks = [...protectedTracks, ...demoTracks].filter(
      (t) => !!t.scene,
    );
    await trackRepo.insert(allTracks as Track[]);
  }
}
