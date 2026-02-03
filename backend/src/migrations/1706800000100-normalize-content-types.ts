import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeContentTypes1706800000100 implements MigrationInterface {
  name = 'NormalizeContentTypes1706800000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "content_pieces"
      SET "type" = CASE lower("type")
        WHEN 'email' THEN 'Email'
        WHEN 'blog' THEN 'Blog'
        WHEN 'social' THEN 'Social'
        WHEN 'ad' THEN 'Ad'
        WHEN 'landing page' THEN 'Landing Page'
        WHEN 'landingpage' THEN 'Landing Page'
        ELSE "type"
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "content_pieces"
      SET "type" = CASE "type"
        WHEN 'Email' THEN 'email'
        WHEN 'Blog' THEN 'blog'
        WHEN 'Social' THEN 'social'
        WHEN 'Ad' THEN 'ad'
        WHEN 'Landing Page' THEN 'landing page'
        ELSE "type"
      END
    `);
  }
}
