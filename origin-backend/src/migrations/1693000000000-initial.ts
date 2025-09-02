import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1693000000000 implements MigrationInterface {
  name = 'Initial1693000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL NOT NULL,
        "email" character varying NOT NULL,
        "name" character varying,
        "googleId" character varying,
        "picture" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "videos" (
        "id" SERIAL NOT NULL,
        "title" character varying NOT NULL,
        "description" character varying,
        "filename" character varying NOT NULL,
        "mimetype" character varying NOT NULL,
        "size" integer NOT NULL,
        "thumbnail" character varying,
        "duration" integer,
        "views" integer NOT NULL DEFAULT 0,
        "isPublic" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" integer,
        CONSTRAINT "PK_e4c86c0cf95aff16e9fb8220f6b" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "videos" 
      ADD CONSTRAINT "FK_4f1ba5a4147e6c6b4a60a24a0e3" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "videos" DROP CONSTRAINT "FK_4f1ba5a4147e6c6b4a60a24a0e3"`);
    await queryRunner.query(`DROP TABLE "videos"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}