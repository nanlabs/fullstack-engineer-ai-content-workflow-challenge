-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('HEADLINE', 'PRODUCT_DESCRIPTION', 'AD_COPY', 'BLOG_POST');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'AI_SUGGESTED', 'REVIEWED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetLanguages" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_pieces" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "aiModel" TEXT,
    "parentId" TEXT,
    "metadata" JSONB,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pieces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_pieces_campaignId_idx" ON "content_pieces"("campaignId");

-- CreateIndex
CREATE INDEX "content_pieces_parentId_idx" ON "content_pieces"("parentId");

-- AddForeignKey
ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "content_pieces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

