import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The rest of the brand: a name, a logo, and the two type stacks.
 *
 * The logo and the font are URLs rather than uploads — this repo has no uploads
 * collection and no storage adapter, and adding one means a bucket every forker
 * has to provision (ADR-0001, C3).
 *
 * Nullable and unseeded, like the colours: blank means the default in
 * globals.css or site.config.ts, so nothing needs backfilling.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "map_appearance" ADD COLUMN "wordmark" varchar;
  ALTER TABLE "map_appearance" ADD COLUMN "logo_url" varchar;
  ALTER TABLE "map_appearance" ADD COLUMN "font_url" varchar;
  ALTER TABLE "map_appearance" ADD COLUMN "display_font" varchar;
  ALTER TABLE "map_appearance" ADD COLUMN "body_font" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "map_appearance" DROP COLUMN "wordmark";
  ALTER TABLE "map_appearance" DROP COLUMN "logo_url";
  ALTER TABLE "map_appearance" DROP COLUMN "font_url";
  ALTER TABLE "map_appearance" DROP COLUMN "display_font";
  ALTER TABLE "map_appearance" DROP COLUMN "body_font";`)
}
