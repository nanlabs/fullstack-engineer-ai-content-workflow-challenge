import { PrismaClient, ContentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.contentPiece.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo1234', 10);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@acme.com',
      password: hashedPassword,
      name: 'Demo User',
    },
  });

  const campaign1 = await prisma.campaign.create({
    data: {
      name: 'Summer Product Launch 2026',
      description:
        'Global launch campaign for our new eco-friendly product line. Targeting young professionals across LATAM, Europe, and North America.',
      targetLanguages: ['en', 'es', 'pt', 'fr'],
      userId: demoUser.id,
      contentPieces: {
        create: [
          {
            title: 'Main Campaign Headline',
            body: '',
            language: 'en',
            status: ContentStatus.DRAFT,
          },
          {
            title: 'Eco Water Bottle Product Description',
            body: '',
            language: 'en',
            status: ContentStatus.DRAFT,
          },
          {
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
      userId: demoUser.id,
      contentPieces: {
        create: [
          {
            title: 'Holiday Gift Guide Headline',
            body: '',
            language: 'en',
            status: ContentStatus.DRAFT,
          },
          {
            title: 'Top 10 Sustainable Gifts for 2026',
            body: '',
            language: 'en',
            status: ContentStatus.DRAFT,
          },
        ],
      },
    },
  });

  console.log(`Seeded user: ${demoUser.email} (password: demo1234)`);
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
