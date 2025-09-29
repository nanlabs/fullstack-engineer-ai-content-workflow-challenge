/*
  Warnings:

  - Added the required column `created_by_id` to the `content_pieces` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "content_pieces" ADD COLUMN     "created_by_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "content_pieces_created_by_id_idx" ON "content_pieces"("created_by_id");

-- AddForeignKey
ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
