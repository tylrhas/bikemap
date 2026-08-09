import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops the admin's own theme. There is one theme now, and it is the map's.
 *
 * Two globals called a theme meant a curator had to know which was which, and
 * only one of them is what anyone visiting the site ever sees. The admin keeps
 * the look `src/app/(payload)/custom.css` gives it — that was always the
 * default this table overrode, so dropping it changes nothing for a deployment
 * that never filled the form in.
 *
 * This does discard anything saved there, `customCss` included. The `down`
 * rebuilds the table but cannot bring the values back.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "theme" CASCADE;
  DROP TYPE "public"."enum_theme_neutral_tint";
  DROP TYPE "public"."enum_theme_corner_style";
  DROP TYPE "public"."enum_theme_font_family";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_theme_neutral_tint" AS ENUM('cool', 'neutral', 'warm');
  CREATE TYPE "public"."enum_theme_corner_style" AS ENUM('sharp', 'soft', 'round');
  CREATE TYPE "public"."enum_theme_font_family" AS ENUM('geist', 'system', 'serif');
  CREATE TABLE "theme" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"accent_color" varchar,
  	"deep_color" varchar,
  	"neutral_tint" "enum_theme_neutral_tint",
  	"corner_style" "enum_theme_corner_style",
  	"font_family" "enum_theme_font_family",
  	"custom_css" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  `)
}
