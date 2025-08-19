import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { Scene } from '../scene/scene.entity';
import { Song } from '../song/song.entity';

export enum LicenseStatus {
  PENDING = 'pending',
  NEGOTIATION = 'negotiation',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// Register the enum for GraphQL
registerEnumType(LicenseStatus, { name: 'LicenseStatus' });

@ObjectType()
@Entity('tracks')
export class Track {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Scene, (scene) => scene.tracks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scene_id' })
  scene!: Scene;

  @Field(() => Song, { nullable: true })
  @ManyToOne(() => Song, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'song_id' })
  song!: Song;

  @Field(() => Int)
  @Column({ type: 'int' })
  startTime!: number; // seconds

  @Field(() => Int)
  @Column({ type: 'int' })
  endTime!: number; // seconds

  @Field(() => LicenseStatus)
  @Column({
    type: 'enum',
    enum: LicenseStatus,
    default: LicenseStatus.PENDING,
  })
  licenseStatus!: LicenseStatus;
}
