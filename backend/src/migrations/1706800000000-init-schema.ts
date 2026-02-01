import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1706800000000 implements MigrationInterface {
  name = 'InitSchema1706800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      `CREATE TABLE "campaigns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(200) NOT NULL,
        "description" text,
        "status" character varying(40) NOT NULL DEFAULT 'ACTIVE',
        "targetLanguages" text NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_campaigns_id" PRIMARY KEY ("id")
      )`
    );
    await queryRunner.query(
      `CREATE TABLE "content_pieces" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "campaignId" uuid NOT NULL,
        "type" character varying(50) NOT NULL,
        "title" character varying(200) NOT NULL,
        "originalText" text NOT NULL,
        "aiDraft" text,
        "translations" jsonb,
        "reviewState" character varying(20) NOT NULL DEFAULT 'DRAFT',
        "metadata" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_content_pieces_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_content_pieces_campaign" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE
      )`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "content_pieces"');
    await queryRunner.query('DROP TABLE "campaigns"');
  }
}
