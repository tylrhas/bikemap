import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/**
 * Puts clay back as the highlight.
 *
 * The previous migration swapped it for COTA's light accent on the grounds that
 * every colour should come from the site. Four still do; this one does not, and
 * that is a choice rather than an oversight — clay reads better on the deep
 * green than anything warm COTA has (4.2:1 against the light accent's 3.6:1),
 * and it is the colour the map was designed around.
 *
 * Data only, no schema, so no `.json` snapshot.
 *
 * Only replaces the value the last migration set, so a curator who has picked
 * their own highlight since keeps it.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "map_appearance"
  SET "primary_color" = '#BD815A'
  WHERE "primary_color" = '#7A885C';`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "map_appearance"
  SET "primary_color" = '#7A885C'
  WHERE "primary_color" = '#BD815A';`);
}
