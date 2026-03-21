import { PrismaClient, ContentType, ContentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.contentPiece.deleteMany();
  await prisma.campaign.deleteMany();

  const campaign1 = await prisma.campaign.create({
    data: {
      name: 'Summer Product Launch 2026',
      description:
        'Global launch campaign for our new eco-friendly product line. Targeting young professionals across LATAM, Europe, and North America.',
      targetLanguages: ['en', 'es', 'pt', 'fr'],
      contentPieces: {
        create: [
          {
            type: ContentType.HEADLINE,
            title: 'Main Campaign Headline',
            body: '',
            language: 'en',
            status: ContentStatus.DRAFT,
          },
          {
            type: ContentType.PRODUCT_DESCRIPTION,
            title: 'Eco Water Bottle Product Description',
            body: '',
            language: 'en',
            status: ContentStatus.DRAFT,
          },
          {
            type: ContentType.AD_COPY,
            title: 'Social Media Ad - Instagram',
            body: '',
            language: 'en',
            status: ContentStatus.DRAFT,
          },
        ],
      },
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      name: 'Holiday Season Campaign',
      description:
        'End-of-year holiday campaign focused on gift-giving and special offers. Warm, festive tone for global markets.',
      targetLanguages: ['en', 'es', 'de'],
      contentPieces: {
        create: [
          {
            type: ContentType.HEADLINE,
            title: 'Holiday Gift Guide Headline',
            body: '',
            language: 'en',
            status: ContentStatus.DRAFT,
          },
          {
            type: ContentType.BLOG_POST,
            title: 'Top 10 Sustainable Gifts for 2026',
            body: '',
            language: 'en',
            status: ContentStatus.DRAFT,
          },
        ],
      },
    },
  });

  console.log(`Seeded campaigns: ${campaign1.name}, ${campaign2.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
