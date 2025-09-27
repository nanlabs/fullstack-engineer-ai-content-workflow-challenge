import { PrismaClient, UserRole, CampaignStatus, ContentStatus, ContentType, ReviewStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data in development
  if (process.env.NODE_ENV === 'development') {
    await prisma.auditLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.translation.deleteMany();
    await prisma.contentPiece.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.user.deleteMany();
  }

  // Create users
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@acmeglobalmedia.com',
      role: UserRole.ADMIN,
    },
  });

  const creator1 = await prisma.user.create({
    data: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@acmeglobalmedia.com',
      role: UserRole.CREATOR,
    },
  });

  const creator2 = await prisma.user.create({
    data: {
      name: 'Mike Rodriguez',
      email: 'mike.rodriguez@acmeglobalmedia.com',
      role: UserRole.CREATOR,
    },
  });

  const reviewer1 = await prisma.user.create({
    data: {
      name: 'Emily Chen',
      email: 'emily.chen@acmeglobalmedia.com',
      role: UserRole.REVIEWER,
    },
  });

  const reviewer2 = await prisma.user.create({
    data: {
      name: 'David Wilson',
      email: 'david.wilson@acmeglobalmedia.com',
      role: UserRole.REVIEWER,
    },
  });

  console.log('Users created');

  // Create campaigns
  const campaign1 = await prisma.campaign.create({
    data: {
      name: 'Summer Product Launch 2024',
      description: 'Marketing campaign for the new summer product line launch.',
      status: CampaignStatus.ACTIVE,
      createdById: creator1.id,
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      name: 'Black Friday Promotion',
      description: 'Annual Black Friday promotional campaign with multi-language support.',
      status: CampaignStatus.DRAFT,
      createdById: creator2.id,
    },
  });

  const campaign3 = await prisma.campaign.create({
    data: {
      name: 'Brand Awareness Q4',
      description: 'Quarterly brand awareness campaign focusing on social media presence.',
      status: CampaignStatus.COMPLETED,
      createdById: admin.id,
    },
  });

  console.log('Campaigns created');

  // Create content pieces for Summer Product Launch
  const socialPost1 = await prisma.contentPiece.create({
    data: {
      campaignId: campaign1.id,
      title: 'Instagram Summer Announcement',
      type: ContentType.SOCIAL_POST,
      content: '🌞 Summer is here! Discover our new collection designed to make your summer unforgettable. #SummerVibes #NewCollection',
      status: ContentStatus.APPROVED,
      language: 'en',
      aiGenerated: true,
      promptUsed: 'Create an engaging Instagram post for a summer product launch',
      aiModelUsed: 'gpt-4',
      tokensUsed: 95,
    },
  });

  const emailSubject1 = await prisma.contentPiece.create({
    data: {
      campaignId: campaign1.id,
      title: 'Launch Day Email Subject',
      type: ContentType.EMAIL_SUBJECT,
      content: 'Your Perfect Summer Starts Now - 20% Off New Arrivals!',
      status: ContentStatus.REVIEW,
      language: 'en',
      aiGenerated: true,
      promptUsed: 'Create a compelling email subject line for a summer product launch with discount',
      aiModelUsed: 'claude-3',
      tokensUsed: 45,
    },
  });

  const blogPost1 = await prisma.contentPiece.create({
    data: {
      campaignId: campaign1.id,
      title: 'Summer Trends Blog Post',
      type: ContentType.BLOG_POST,
      content: 'As the warm weather approaches, it\'s time to refresh your style with the latest summer trends. Our new collection combines comfort with contemporary design...',
      status: ContentStatus.DRAFT,
      language: 'en',
      aiGenerated: false,
    },
  });

  // Create content pieces for Black Friday
  const adCopy1 = await prisma.contentPiece.create({
    data: {
      campaignId: campaign2.id,
      title: 'Black Friday Main Ad',
      type: ContentType.AD_COPY,
      content: 'BIGGEST SALE OF THE YEAR! Up to 70% off everything. Black Friday exclusive deals you can\'t miss. Shop now before it\'s too late!',
      status: ContentStatus.AI_GENERATED,
      language: 'en',
      aiGenerated: true,
      promptUsed: 'Create urgent and compelling Black Friday ad copy with up to 70% discount',
      aiModelUsed: 'gpt-4',
      tokensUsed: 78,
    },
  });

  const emailBody1 = await prisma.contentPiece.create({
    data: {
      campaignId: campaign2.id,
      title: 'Black Friday Email Campaign',
      type: ContentType.EMAIL_BODY,
      content: 'Dear Valued Customer,\n\nThe wait is over! Our exclusive Black Friday sale is now live...',
      status: ContentStatus.DRAFT,
      language: 'en',
      aiGenerated: false,
    },
  });

  console.log('Content pieces created');

  // Create translations for approved content
  await prisma.translation.create({
    data: {
      contentPieceId: socialPost1.id,
      language: 'es',
      content: '🌞 ¡El verano está aquí! Descubre nuestra nueva colección diseñada para hacer tu verano inolvidable. #VibesDeVerano #NuevaColección',
      status: 'COMPLETED',
      aiModelUsed: 'gpt-4',
      tokensUsed: 102,
    },
  });

  await prisma.translation.create({
    data: {
      contentPieceId: socialPost1.id,
      language: 'fr',
      content: '🌞 L\'été est là ! Découvrez notre nouvelle collection conçue pour rendre votre été inoubliable. #AmbianceÉté #NouvelleCollection',
      status: 'PENDING',
      aiModelUsed: 'claude-3',
      tokensUsed: 98,
    },
  });

  console.log('Translations created');

  // Create reviews
  await prisma.review.create({
    data: {
      contentPieceId: emailSubject1.id,
      reviewerId: reviewer1.id,
      status: ReviewStatus.PENDING,
      comments: 'The subject line looks good, but we might want to test different discount percentages. Consider A/B testing 20% vs 25%.',
    },
  });

  await prisma.review.create({
    data: {
      contentPieceId: socialPost1.id,
      reviewerId: reviewer2.id,
      status: ReviewStatus.APPROVED,
      comments: 'Perfect tone for our summer campaign! The emojis and hashtags are on brand.',
      reviewedAt: new Date(),
    },
  });

  await prisma.review.create({
    data: {
      contentPieceId: adCopy1.id,
      reviewerId: reviewer1.id,
      status: ReviewStatus.CHANGES_REQUESTED,
      comments: 'The urgency is good, but we need to specify which products are included in the 70% discount. Please add more details.',
    },
  });

  console.log('Reviews created');

  // Create some audit logs for tracking
  await prisma.auditLog.create({
    data: {
      entityType: 'content_piece',
      entityId: socialPost1.id,
      action: 'status_changed',
      oldValues: { status: 'AI_GENERATED' },
      newValues: { status: 'APPROVED' },
      userId: reviewer2.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: 'campaign',
      entityId: campaign1.id,
      action: 'created',
      newValues: { name: 'Summer Product Launch 2024', status: 'ACTIVE' },
      userId: creator1.id,
    },
  });

  console.log('Audit logs created');

  console.log('Database seeded successfully!');

}

main()
  .catch((e) => {
    console.error('Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
