import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.campaign.count();
  if (existing > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  const summerCampaign = await prisma.campaign.create({
    data: {
      name: 'Summer 2026 Product Launch',
      description:
        'Global launch campaign for our new eco-friendly product line targeting millennial consumers across NA, EU, and LATAM markets.',
      status: 'active',
      sourceLanguage: 'en',
      targetLanguages: ['es', 'fr', 'de', 'pt'],
      contentPieces: {
        create: [
          {
            type: 'headline',
            originalText: 'Introducing EcoLine — Sustainability Meets Style',
            language: 'en',
          },
          {
            type: 'description',
            originalText:
              'Our new EcoLine collection combines premium materials with sustainable manufacturing. Every piece is crafted from 100% recycled materials without compromising on quality or design.',
            language: 'en',
          },
          {
            type: 'cta',
            originalText: 'Shop the Collection — Free Shipping on Orders Over $50',
            language: 'en',
          },
          {
            type: 'tagline',
            originalText: 'Wear the Change.',
            language: 'en',
          },
        ],
      },
    },
  });

  const holidayCampaign = await prisma.campaign.create({
    data: {
      name: 'Holiday Season 2026',
      description:
        'End-of-year holiday campaign featuring gift guides, limited editions, and festive promotions across digital and social channels.',
      status: 'active',
      sourceLanguage: 'en',
      targetLanguages: ['es', 'fr', 'ja'],
      contentPieces: {
        create: [
          {
            type: 'headline',
            originalText: 'The Perfect Gift Awaits — Holiday Collection 2026',
            language: 'en',
          },
          {
            type: 'body',
            originalText:
              "This holiday season, discover curated gift sets designed to delight. From luxurious self-care bundles to tech-forward accessories, we've handpicked the best for everyone on your list. Limited quantities available — shop early for the best selection.",
            language: 'en',
          },
          {
            type: 'description',
            originalText:
              'Curated holiday gift sets featuring exclusive limited-edition items. Premium packaging included with every order.',
            language: 'en',
          },
          {
            type: 'cta',
            originalText: 'Explore Gift Guides — Order by Dec 15 for Guaranteed Delivery',
            language: 'en',
          },
        ],
      },
    },
  });

  console.log(`Seeded campaigns: ${summerCampaign.name}, ${holidayCampaign.name}`);
  console.log('Database seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
