/*
  Warnings:

  - The values [REVIEW] on the enum `ContentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `reviews` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContentStatus_new" AS ENUM ('DRAFT', 'AI_GENERATED', 'APPROVED', 'REJECTED');
ALTER TABLE "content_pieces" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "content_pieces" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ("status"::text::"ContentStatus_new");
ALTER TYPE "ContentStatus" RENAME TO "ContentStatus_old";
ALTER TYPE "ContentStatus_new" RENAME TO "ContentStatus";
DROP TYPE "ContentStatus_old";
ALTER TABLE "content_pieces" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_content_piece_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_reviewer_id_fkey";

-- DropTable
DROP TABLE "reviews";

-- DropEnum
DROP TYPE "ReviewStatus";
