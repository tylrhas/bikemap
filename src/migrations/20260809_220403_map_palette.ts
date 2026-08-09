import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The rest of the visible palette: light surface, accent and body text, joining
 * the highlight and deep surface that were already editable.
 *
 * Nullable and unseeded, like the two before them — blank means the default in
 * globals.css, so nothing needs backfilling and clearing a field is how a
 * curator resets it.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "map_appearance" ADD COLUMN "surface_color" varchar;
  ALTER TABLE "map_appearance" ADD COLUMN "accent_color" varchar;
  ALTER TABLE "map_appearance" ADD COLUMN "ink_color" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "map_appearance" DROP COLUMN "surface_color";
  ALTER TABLE "map_appearance" DROP COLUMN "accent_color";
  ALTER TABLE "map_appearance" DROP COLUMN "ink_color";`)
}
