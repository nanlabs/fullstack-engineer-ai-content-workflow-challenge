-- AlterTable
ALTER TABLE "public"."campaigns" ADD COLUMN     "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."content_pieces" ADD COLUMN     "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."drafts" ADD COLUMN     "cost" DOUBLE PRECISION NOT NULL DEFAULT 0;
