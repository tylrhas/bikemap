import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/**
 * Puts the shipped palette into the Theme global.
 *
 * Data only, no schema — hand-written, which is why there is no `.json`
 * snapshot beside it.
 *
 * Blank already meant "use the default", so this changes nothing about how the
 * map looks. It changes what the form looks like: five empty boxes tell a
 * curator nothing, and you cannot nudge a color you cannot see.
 *
 * Values mirror `DEFAULT_BRAND_COLORS` in `src/data/brand.ts`, which
 * `brand.test.ts` holds to the channels in `globals.css`. Keep all three in
 * step; the test will tell you if two of them drift.
 *
 * **Only fills a blank.** `COALESCE` means a deployment that has already picked
 * its colors keeps them, and re-running is harmless. It also inserts the row if
 * a global has never been saved — Payload creates that lazily, so on a fresh
 * database there is nothing to update yet.
 *
 * Fonts are deliberately not seeded: the bundled faces are loaded by
 * `next/font` under a generated family name, so a literal `"Fraunces", serif`
 * would name a font nothing has loaded and quietly fall through to Georgia.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  INSERT INTO "map_appearance" ("id", "primary_color", "secondary_color", "surface_color", "ink_color", "accent_color", "updated_at", "created_at")
  VALUES (1, '#BD815A', '#023428', '#FFFFFF', '#023428', '#00634B', now(), now())
  ON CONFLICT ("id") DO UPDATE SET
    "primary_color"   = COALESCE(NULLIF("map_appearance"."primary_color", ''),   '#BD815A'),
    "secondary_color" = COALESCE(NULLIF("map_appearance"."secondary_color", ''), '#023428'),
    "surface_color"   = COALESCE(NULLIF("map_appearance"."surface_color", ''),   '#FFFFFF'),
    "ink_color"       = COALESCE(NULLIF("map_appearance"."ink_color", ''),       '#023428'),
    "accent_color"    = COALESCE(NULLIF("map_appearance"."accent_color", ''),    '#00634B');`);
}

/**
 * Clears the seeded values, and only those — a color a curator has since
 * changed is theirs, not ours to blank.
 */
export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "map_appearance" SET
    "primary_color"   = NULLIF("primary_color",   '#BD815A'),
    "secondary_color" = NULLIF("secondary_color", '#023428'),
    "surface_color"   = NULLIF("surface_color",   '#FFFFFF'),
    "ink_color"       = NULLIF("ink_color",       '#023428'),
    "accent_color"    = NULLIF("accent_color",    '#00634B');`);
}
