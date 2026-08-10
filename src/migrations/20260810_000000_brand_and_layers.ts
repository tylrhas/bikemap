import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';
import { COTA_BRAND_COLORS } from '../data/brand';

/**
 * The Theme global grown up, the admin's own theme retired, and Map layers.
 *
 * One migration rather than the eight this arrived as. Those were written a
 * decision at a time — add three colours, add a name and a logo, add type, drop
 * the admin theme, seed, add a layer switch, add two more, correct the palette,
 * correct it again — and none of them had run anywhere but a laptop. Shipping
 * the sequence would have made every deployment replay a conversation.
 *
 * The five before this one are published and are left exactly as they are.
 *
 * The seeded palette is COTA's, imported from `data/brand.ts` rather than
 * written out here, so there is one copy of those hexes in the repo. It is
 * **data**: the app's own teal and lime live in `globals.css` and are what a
 * fork gets with no database or an untouched form.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // The rest of the brand. All nullable and unseeded except the colours below,
  // because blank already means "use the stylesheet default".
  await db.execute(sql`
  ALTER TABLE "map_appearance" ADD COLUMN "surface_color" varchar;
  ALTER TABLE "map_appearance" ADD COLUMN "accent_color" varchar;
  ALTER TABLE "map_appearance" ADD COLUMN "ink_color" varchar;
  ALTER TABLE "map_appearance" ADD COLUMN "wordmark" varchar;
  ALTER TABLE "map_appearance" ADD COLUMN "logo_url" varchar;
  ALTER TABLE "map_appearance" ADD COLUMN "font_url" varchar;
  ALTER TABLE "map_appearance" ADD COLUMN "display_font" varchar;
  ALTER TABLE "map_appearance" ADD COLUMN "body_font" varchar;`);

  // There is one theme now and it is the map's. The admin keeps whatever
  // `src/app/(payload)/custom.css` gives it, which was always the default this
  // table overrode.
  await db.execute(sql`
  DROP TABLE IF EXISTS "theme" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_theme_neutral_tint";
  DROP TYPE IF EXISTS "public"."enum_theme_corner_style";
  DROP TYPE IF EXISTS "public"."enum_theme_font_family";`);

  // Which sections and layers riders are offered. On by default, so an existing
  // deployment keeps everything it had — and the read layer treats anything but
  // an explicit false as on, because a global nobody has saved comes back
  // without the field rather than with its default.
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "map_layers" (
    "id" serial PRIMARY KEY NOT NULL,
    "casual_routes" boolean DEFAULT true,
    "rides" boolean DEFAULT true,
    "osm_trails" boolean DEFAULT true,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );`);

  // Seeded so the form opens showing the palette rather than five empty boxes —
  // you cannot nudge a colour you cannot see. Only ever fills a blank, so a
  // deployment that has already picked its colours keeps them, and re-running
  // is harmless. The insert is for a fresh database: Payload creates a global's
  // row lazily, so there may be nothing to update yet.
  const { primaryColor, secondaryColor, surfaceColor, inkColor, accentColor } =
    COTA_BRAND_COLORS;
  await db.execute(sql`
  INSERT INTO "map_appearance" ("id", "primary_color", "secondary_color", "surface_color", "ink_color", "accent_color", "updated_at", "created_at")
  VALUES (1, ${primaryColor}, ${secondaryColor}, ${surfaceColor}, ${inkColor}, ${accentColor}, now(), now())
  ON CONFLICT ("id") DO UPDATE SET
    "primary_color"   = COALESCE(NULLIF("map_appearance"."primary_color", ''),   ${primaryColor}),
    "secondary_color" = COALESCE(NULLIF("map_appearance"."secondary_color", ''), ${secondaryColor}),
    "surface_color"   = COALESCE(NULLIF("map_appearance"."surface_color", ''),   ${surfaceColor}),
    "ink_color"       = COALESCE(NULLIF("map_appearance"."ink_color", ''),       ${inkColor}),
    "accent_color"    = COALESCE(NULLIF("map_appearance"."accent_color", ''),    ${accentColor});`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE IF EXISTS "map_layers" CASCADE;
  ALTER TABLE "map_appearance" DROP COLUMN IF EXISTS "surface_color";
  ALTER TABLE "map_appearance" DROP COLUMN IF EXISTS "accent_color";
  ALTER TABLE "map_appearance" DROP COLUMN IF EXISTS "ink_color";
  ALTER TABLE "map_appearance" DROP COLUMN IF EXISTS "wordmark";
  ALTER TABLE "map_appearance" DROP COLUMN IF EXISTS "logo_url";
  ALTER TABLE "map_appearance" DROP COLUMN IF EXISTS "font_url";
  ALTER TABLE "map_appearance" DROP COLUMN IF EXISTS "display_font";
  ALTER TABLE "map_appearance" DROP COLUMN IF EXISTS "body_font";`);

  // The admin theme is not rebuilt. Its table held four settings and a CSS box,
  // all of which now live in a stylesheet; recreating an empty one would be
  // restoring the shape of a feature without the feature.
}
