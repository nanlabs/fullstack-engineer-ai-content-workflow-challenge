-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AlterTable: add userId column (nullable first for existing rows)
ALTER TABLE "campaigns" ADD COLUMN "userId" TEXT;

-- Backfill: create a system user for any existing campaigns
DO $$
DECLARE
    system_user_id TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM "campaigns" WHERE "userId" IS NULL) THEN
        system_user_id := gen_random_uuid()::TEXT;
        INSERT INTO "users" ("id", "email", "password", "name", "createdAt", "updatedAt")
        VALUES (system_user_id, 'system@acme.local', 'NOLOGIN', 'System', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        UPDATE "campaigns" SET "userId" = system_user_id WHERE "userId" IS NULL;
    END IF;
END $$;

-- Now make it NOT NULL
ALTER TABLE "campaigns" ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "campaigns_userId_idx" ON "campaigns"("userId");
