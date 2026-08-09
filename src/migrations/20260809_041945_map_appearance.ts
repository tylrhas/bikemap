import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The public map's brand colors, editable in the admin.
 *
 * No seed and no backfill on purpose: both columns are nullable, and blank
 * means "use the default". The defaults live in `globals.css`, so a deployment
 * that never opens this form is fully colored, and clearing a field is how you
 * reset it rather than a way to break the map.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "map_appearance" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"primary_color" varchar,
  	"secondary_color" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "map_appearance" CASCADE;`)
}
