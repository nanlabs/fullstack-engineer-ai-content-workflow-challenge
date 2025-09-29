-- DropIndex
DROP INDEX "public"."translations_content_piece_id_language_key";

-- AlterTable
ALTER TABLE "public"."translations" ADD COLUMN     "variant" TEXT;
