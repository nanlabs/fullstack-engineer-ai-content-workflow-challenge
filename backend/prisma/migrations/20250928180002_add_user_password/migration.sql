/*
  Warnings:

  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable - Add password column with temporary default
ALTER TABLE "users" ADD COLUMN "password" TEXT NOT NULL DEFAULT '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

-- Update existing users with a default hashed password (password123)
UPDATE "users" SET "password" = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

-- Remove the default constraint
ALTER TABLE "users" ALTER COLUMN "password" DROP DEFAULT;
