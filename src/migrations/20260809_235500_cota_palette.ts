import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/**
 * Replaces the seeded palette with COTA's own.
 *
 * The first seed took its hexes from the written brief. Four of the five turned
 * out not to be on cotamtb.com at all — a tan, a coral, an off-white and a
 * near-black, where the site uses its light accent, its accent, plain white and
 * its black. Only the deep green was ever right.
 *
 * Data only, no schema, so there is no `.json` snapshot beside it.
 *
 * **Only replaces a value this repo put there.** A curator who has since picked
 * their own color keeps it; the `WHERE` is what makes that true, and it is why
 * this is safe to run on a deployment that has already been branded.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "map_appearance" SET
    "primary_color" = CASE WHEN "primary_color" = '#BD815A' THEN '#7A885C' ELSE "primary_color" END,
    "surface_color" = CASE WHEN "surface_color" = '#F5EFE6' THEN '#FFFFFF' ELSE "surface_color" END,
    "ink_color"     = CASE WHEN "ink_color"     = '#14231D' THEN '#023428' ELSE "ink_color"     END,
    "accent_color"  = CASE WHEN "accent_color"  = '#FCA793' THEN '#00634B' ELSE "accent_color"  END;`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "map_appearance" SET
    "primary_color" = CASE WHEN "primary_color" = '#7A885C' THEN '#BD815A' ELSE "primary_color" END,
    "surface_color" = CASE WHEN "surface_color" = '#FFFFFF' THEN '#F5EFE6' ELSE "surface_color" END,
    "ink_color"     = CASE WHEN "ink_color"     = '#023428' THEN '#14231D' ELSE "ink_color"     END,
    "accent_color"  = CASE WHEN "accent_color"  = '#00634B' THEN '#FCA793' ELSE "accent_color"  END;`);
}
