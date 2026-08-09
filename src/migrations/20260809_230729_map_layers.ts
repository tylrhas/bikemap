import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Which optional layers the map offers. One row, one switch so far.
 *
 * `osm_trails` defaults true and the read layer treats anything but an explicit
 * `false` as on, so an existing deployment keeps the nationwide toggle it
 * already had and a fresh one gets the app as it ships. Nothing to backfill.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "map_layers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"osm_trails" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "map_layers" CASCADE;`)
}
