import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Race events: `race_events` and its `race_events_checkpoints` array table.
 *
 * The SQL is exactly as Payload generated it, so a later `migrate:create` sees
 * no drift. Three things to know:
 *
 * - **New tables only, so there is no backfill.** Nothing existing changes
 *   shape, unlike the rating/kind and trail-area migrations.
 * - `trail_id` is NOT NULL with an ON DELETE SET NULL foreign key, the same
 *   pair as `trail_conditions` — so Postgres refuses to delete a trail that has
 *   a race on it. `Trails` has a `beforeDelete` hook (`deleteRaceEvents`) that
 *   clears them first; a not-null violation here means it broke.
 * - **No seed.** A race is one org's calendar, not a vocabulary, so unlike
 *   `trail_condition_types` there is nothing sensible to ship rows for.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_race_events_direction" AS ENUM('forward', 'reverse');
  CREATE TYPE "public"."enum_race_events_city" AS ENUM('chattanooga', 'bend');
  CREATE TABLE "race_events_checkpoints" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"mile" numeric NOT NULL,
  	"label" varchar NOT NULL,
  	"lead_eta" timestamp(3) with time zone,
  	"sweep_eta" timestamp(3) with time zone,
  	"is_cutoff" boolean DEFAULT false
  );
  
  CREATE TABLE "race_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"trail_id" integer NOT NULL,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"direction" "enum_race_events_direction" DEFAULT 'forward' NOT NULL,
  	"origin_label" varchar DEFAULT 'trailhead',
  	"terminus_label" varchar,
  	"course_gpx" jsonb,
  	"finished" boolean DEFAULT false,
  	"city" "enum_race_events_city" DEFAULT 'bend' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "race_events_id" integer;
  ALTER TABLE "race_events_checkpoints" ADD CONSTRAINT "race_events_checkpoints_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."race_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "race_events" ADD CONSTRAINT "race_events_trail_id_trails_id_fk" FOREIGN KEY ("trail_id") REFERENCES "public"."trails"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "race_events_checkpoints_order_idx" ON "race_events_checkpoints" USING btree ("_order");
  CREATE INDEX "race_events_checkpoints_parent_id_idx" ON "race_events_checkpoints" USING btree ("_parent_id");
  CREATE INDEX "race_events_trail_idx" ON "race_events" USING btree ("trail_id");
  CREATE INDEX "race_events_starts_at_idx" ON "race_events" USING btree ("starts_at");
  CREATE INDEX "race_events_finished_idx" ON "race_events" USING btree ("finished");
  CREATE INDEX "race_events_updated_at_idx" ON "race_events" USING btree ("updated_at");
  CREATE INDEX "race_events_created_at_idx" ON "race_events" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_race_events_fk" FOREIGN KEY ("race_events_id") REFERENCES "public"."race_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_race_events_id_idx" ON "payload_locked_documents_rels" USING btree ("race_events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "race_events_checkpoints" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "race_events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "race_events_checkpoints" CASCADE;
  DROP TABLE "race_events" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_race_events_fk";
  
  DROP INDEX "payload_locked_documents_rels_race_events_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "race_events_id";
  DROP TYPE "public"."enum_race_events_direction";
  DROP TYPE "public"."enum_race_events_city";`)
}
