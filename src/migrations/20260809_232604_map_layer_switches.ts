import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Two more switches: casual routes, and ride tracking.
 *
 * Both default true and the read layer treats anything but an explicit `false`
 * as on, so an existing deployment keeps everything it had. Nothing to
 * backfill. Turning ride tracking off removes the feature, not anyone's rides —
 * those live in the browser's own storage and this migration cannot reach them.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "map_layers" ADD COLUMN "casual_routes" boolean DEFAULT true;
  ALTER TABLE "map_layers" ADD COLUMN "rides" boolean DEFAULT true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "map_layers" DROP COLUMN "casual_routes";
  ALTER TABLE "map_layers" DROP COLUMN "rides";`)
}
