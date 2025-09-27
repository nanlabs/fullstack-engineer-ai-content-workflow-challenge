-- CreateEnum
CREATE TYPE "public"."ReviewState" AS ENUM ('DRAFT', 'SUGGESTED_BY_AI', 'REVIEWED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."content_pieces" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contentType" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "content_pieces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."drafts" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reviewState" "public"."ReviewState" NOT NULL DEFAULT 'DRAFT',
    "aiModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contentPieceId" TEXT NOT NULL,

    CONSTRAINT "drafts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."content_pieces" ADD CONSTRAINT "content_pieces_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."drafts" ADD CONSTRAINT "drafts_contentPieceId_fkey" FOREIGN KEY ("contentPieceId") REFERENCES "public"."content_pieces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
