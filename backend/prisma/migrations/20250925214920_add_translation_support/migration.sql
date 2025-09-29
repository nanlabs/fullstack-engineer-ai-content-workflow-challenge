-- AlterTable
ALTER TABLE "public"."drafts" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "translationStates" JSONB,
ADD COLUMN     "translations" JSONB;
