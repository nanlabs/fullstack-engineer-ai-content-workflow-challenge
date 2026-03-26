-- AlterTable: drop type column
ALTER TABLE "content_pieces" DROP COLUMN "type";

-- DropEnum
DROP TYPE "ContentType";
