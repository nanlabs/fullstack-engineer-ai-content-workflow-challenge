import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { Track } from '../../track/track.entity';
import { LicenseStatus } from '../../track/track.entity';
import { Scene } from '../../scene/scene.entity';
import { Song } from '../../song/song.entity';

export class TrackSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const sceneRepo = dataSource.getRepository(Scene);
    const songRepo = dataSource.getRepository(Song);

    const scenes = await sceneRepo.find();
    const songs = await songRepo.find();

    await dataSource.getRepository(Track).insert([
      {
        startTime: 0,
        endTime: 120,
        licenseStatus: LicenseStatus.APPROVED,
        scene: scenes.find((s) => s.name === 'Dream Within a Dream'),
        song: songs.find((s) => s.title === 'Time'),
      },
      {
        startTime: 45,
        endTime: 180,
        licenseStatus: LicenseStatus.NEGOTIATION,
        scene: scenes.find((s) => s.name === 'Bank Heist'),
        song: songs.find((s) => s.title === 'Why So Serious?'),
      },
      {
        startTime: 30,
        endTime: 90,
        licenseStatus: LicenseStatus.PENDING,
        scene: scenes.find((s) => s.name === 'Truck Flip'),
      },
      {
        startTime: 60,
        endTime: 180,
        licenseStatus: LicenseStatus.APPROVED,
        scene: scenes.find((s) => s.name === 'Truck Flip'),
        song: songs.find((s) => s.title === 'Non, Je Ne Regrette Rien'),
      },
    ]);
  }
}
