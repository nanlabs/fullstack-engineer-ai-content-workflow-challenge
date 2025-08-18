import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Scene } from '../scene/scene.entity';
import { Song } from '../song/song.entity';

export enum LicenseStatus {
  PENDING = 'pending',
  NEGOTIATION = 'negotiation',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('tracks')
export class Track {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Scene, (scene) => scene.tracks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scene_id' })
  scene!: Scene;

  @ManyToOne(() => Song, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'song_id' })
  song!: Song;

  @Column({ type: 'int' })
  startTime!: number; // seconds

  @Column({ type: 'int' })
  endTime!: number; // seconds

  @Column({
    type: 'enum',
    enum: LicenseStatus,
    default: LicenseStatus.PENDING,
  })
  licenseStatus!: LicenseStatus;
}
