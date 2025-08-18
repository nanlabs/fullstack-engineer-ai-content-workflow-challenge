import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('songs')
export class Song {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 255 })
  artist!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  album?: string;

  @Column({ type: 'int', nullable: true })
  duration?: number; // seconds
}
