import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from '../campaigns/campaign.entity';
import { CampaignStatus } from '../campaigns/campaign-status.enum';
import { ContentPiece } from '../content/content-piece.entity';
import { ReviewState } from '../content/review-state.enum';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(ContentPiece)
    private readonly contentRepository: Repository<ContentPiece>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const skipSeed = this.configService.get<string>('SKIP_SEED') === 'true';

    if (skipSeed) {
      this.logger.log('Skipping seed data (SKIP_SEED=true)');
      return;
    }

    const existingCount = await this.campaignRepository.count();

    if (existingCount > 0) {
      this.logger.log(`Database already has ${existingCount} campaign(s), skipping seed`);
      return;
    }

    this.logger.log('No data found, inserting sample data...');
    await this.seedData();
    this.logger.log('Sample data inserted successfully');
  }

  private async seedData(): Promise<void> {
    // Campaign 1: Summer Sale
    const summerSale = this.campaignRepository.create({
      name: 'Summer Sale 2024',
      description: 'Our annual summer promotion with discounts up to 50%',
      status: CampaignStatus.Active,
      targetLanguages: ['en', 'es', 'fr'],
    });

    const savedSummerSale = await this.campaignRepository.save(summerSale);

    // Content pieces for Summer Sale
    const summerBlog = this.contentRepository.create({
      campaignId: savedSummerSale.id,
      type: 'blog',
      title: 'Top 10 Summer Deals You Cannot Miss',
      originalText: 'This summer, we are bringing you incredible savings on our best products. From electronics to home goods, discover deals that will make your summer unforgettable.',
      reviewState: ReviewState.Draft,
    });

    const summerSocial = this.contentRepository.create({
      campaignId: savedSummerSale.id,
      type: 'social',
      title: 'Summer Sale Instagram Post',
      originalText: '☀️ SUMMER IS HERE! ☀️ Get up to 50% off everything! Limited time only. Shop now!',
      reviewState: ReviewState.AiSuggested,
      aiDraft: '☀️ Summer vibes = BIG savings! ☀️ Score up to 50% off sitewide. Do not sleep on these deals! 🛍️ #SummerSale #ShopNow',
      translations: {
        es: '☀️ ¡Llegó el verano! ☀️ Hasta 50% de descuento en todo. ¡No te lo pierdas!',
      },
    });

    await this.contentRepository.save([summerBlog, summerSocial]);

    // Campaign 2: Product Launch
    const productLaunch = this.campaignRepository.create({
      name: 'New Product Launch',
      description: 'Introducing our revolutionary new product line',
      status: CampaignStatus.Paused,
      targetLanguages: ['en', 'de'],
    });

    const savedProductLaunch = await this.campaignRepository.save(productLaunch);

    // Content pieces for Product Launch
    const launchEmail = this.contentRepository.create({
      campaignId: savedProductLaunch.id,
      type: 'email',
      title: 'Product Launch Announcement Email',
      originalText: 'We are thrilled to announce the launch of our new product. After months of development, it is finally here. Be among the first to experience innovation.',
      reviewState: ReviewState.InReview,
      aiDraft: 'The wait is over! Introducing our groundbreaking new product. Join thousands of early adopters and be part of the revolution. Order now and get exclusive early-bird pricing!',
    });

    await this.contentRepository.save(launchEmail);
  }
}
