import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from '../campaign/campaign.entity';
import { ContentPiece } from '../content-piece/content-pieces.entity';
import { ContentLocalization } from '../content-localization/content-localizations.entity';
import { ReviewStatus } from '../status-enum';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(ContentPiece)
    private readonly pieceRepo: Repository<ContentPiece>,
    @InjectRepository(ContentLocalization)
    private readonly localizationRepo: Repository<ContentLocalization>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const seedEnabled = this.configService.get<string>('SEED_ON_BOOT', 'true') === 'true';
    if (!seedEnabled) {
      this.logger.log('Seed skipped: SEED_ON_BOOT is disabled');
      return;
    }

    const campaignsCount = await this.campaignRepo.count();
    if (campaignsCount > 0) {
      this.logger.log(`Seed skipped: ${campaignsCount} campaign(s) already exist`);
      return;
    }

    await this.seedCampaigns();
    this.logger.log('Seed completed: demo campaigns created');
  }

  private async seedCampaigns(): Promise<void> {
    const campaigns = await this.campaignRepo.save([
      {
        topic: 'Childhood vaccination awareness for families',
        description:
          'Educational campaign with practical reminders for routine pediatric vaccines.',
        languages: ['en-US', 'es-MX'],
        llmProvider: 'openai',
        model: 'gpt-4o-mini',
      },
      {
        topic: 'Healthy hydration habits for summer',
        description: 'Seasonal campaign for social channels and newsletters.',
        languages: ['en-GB', 'fr-FR', 'pt-BR'],
        llmProvider: 'anthropic',
        model: 'claude-3-5-haiku-latest',
      },
    ]);

    const firstCampaignPieces = await this.pieceRepo.save([
      {
        campaign: campaigns[0],
        name: 'Instagram carousel - vaccine schedule',
        type: 'instagram_post',
      },
      {
        campaign: campaigns[0],
        name: 'Parent newsletter - vaccine myths',
        type: 'email_newsletter',
      },
    ]);

    const secondCampaignPieces = await this.pieceRepo.save([
      {
        campaign: campaigns[1],
        name: 'Blog post - hydration tips',
        type: 'blog_post',
      },
      {
        campaign: campaigns[1],
        name: 'Short social copy - hydration reminders',
        type: 'instagram_post',
      },
    ]);

    await this.localizationRepo.save([
      {
        contentPiece: firstCampaignPieces[0],
        languageCode: 'en-US',
        titleSuggestion: 'Keep your child protected all year',
        bodySuggestion:
          'Check your pediatric vaccine calendar and set reminders so every dose stays on track.',
        status: ReviewStatus.AI_SUGGESTED,
      },
      {
        contentPiece: firstCampaignPieces[0],
        languageCode: 'es-MX',
        titleSuggestion: 'Protege a tus peques todo el ano',
        bodySuggestion:
          'Revisa el esquema de vacunacion con tu pediatra y activa recordatorios para cada dosis.',
        status: ReviewStatus.REVIEWED,
      },
      {
        contentPiece: firstCampaignPieces[1],
        languageCode: 'en-US',
        titleSuggestion: 'Vaccine myths vs facts for parents',
        bodySuggestion:
          'Get simple, trusted answers to common vaccine questions from pediatric experts.',
        status: ReviewStatus.APPROVED,
      },
      {
        contentPiece: firstCampaignPieces[1],
        languageCode: 'es-MX',
        titleSuggestion: 'Mitos y realidades sobre vacunas',
        bodySuggestion:
          'Aclara tus dudas con informacion confiable y recomendaciones medicas para tu familia.',
        status: ReviewStatus.REJECTED,
      },
      {
        contentPiece: secondCampaignPieces[0],
        languageCode: 'en-GB',
        titleSuggestion: 'Stay hydrated during warmer days',
        bodySuggestion:
          'Simple daily habits can help your family keep energy up and avoid dehydration.',
        status: ReviewStatus.AI_SUGGESTED,
      },
      {
        contentPiece: secondCampaignPieces[0],
        languageCode: 'fr-FR',
        titleSuggestion: "Hydratation d'ete: les gestes simples",
        bodySuggestion:
          "Adoptez des routines faciles pour rester hydrate tout au long de l'ete.",
        status: ReviewStatus.DRAFT,
      },
      {
        contentPiece: secondCampaignPieces[0],
        languageCode: 'pt-BR',
        titleSuggestion: 'Hidratacao no verao sem complicacao',
        bodySuggestion:
          'Com pequenas mudancas na rotina, sua familia fica hidratada e com mais disposicao.',
        status: ReviewStatus.REVIEWED,
      },
      {
        contentPiece: secondCampaignPieces[1],
        languageCode: 'en-GB',
        titleSuggestion: 'Quick hydration reminder',
        bodySuggestion: 'Keep a water bottle nearby and sip regularly throughout your day.',
        status: ReviewStatus.APPROVED,
      },
      {
        contentPiece: secondCampaignPieces[1],
        languageCode: 'fr-FR',
        titleSuggestion: "Petit rappel hydratation",
        bodySuggestion: "Gardez une bouteille d'eau a portee de main et buvez regulierement.",
        status: ReviewStatus.REVIEWED,
      },
      {
        contentPiece: secondCampaignPieces[1],
        languageCode: 'pt-BR',
        titleSuggestion: 'Lembrete rapido de hidratacao',
        bodySuggestion: 'Tenha sempre uma garrafa por perto e beba agua ao longo do dia.',
        status: ReviewStatus.AI_SUGGESTED,
      },
    ]);
  }
}
