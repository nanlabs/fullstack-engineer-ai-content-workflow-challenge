import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Campaign } from '../campaign/campaign.entity';
import { ContentLocalization } from '../content-localization/content-localizations.entity';

@Entity('content_pieces')
export class ContentPiece {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // Ej: "Social Media Post - Summer"

  @Column()
  type: string; // Ej: "Email", "Banner", "Tweet"

  @ManyToOne(() => Campaign, (campaign) => campaign.pieces, { onDelete: 'CASCADE' })
  campaign: Campaign;

  // Relación: Una pieza tiene muchas localizaciones (idiomas)
  @OneToMany(() => ContentLocalization, (loc) => loc.contentPiece)
  localizations: ContentLocalization[];
}
