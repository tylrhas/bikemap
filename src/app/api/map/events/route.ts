/**
 * Races running on the map's trails.
 *
 *   /api/map/events
 *
 * No `?city=` param, unlike the conditions route: a deployment serves one
 * region, so the city is read from config the way `/api/map/elevation/[slug]`
 * reads it. A parameter whose only valid value is a constant is a validation
 * branch nobody exercises correctly.
 *
 * Under /api/map because Payload mounts its own REST API at /api/<collection>,
 * and a route at /api/race-events would shadow that collection — which is also
 * the door the collection's admin-only access rules keep shut.
 */
import { NextResponse } from 'next/server';
import { RACE_REFRESH_SECONDS } from '@/data/race-events';
import { getRaceEvents } from '@/payload/read/race-events';

// GET only, so the cache can be a segment setting rather than a header dance.
// 60s matches the page's ISR: an organizer ticking "Finished" mid-race is off
// the map within a minute.
// Next.js requires route-segment config to be statically analyzable, so this
// must remain a literal. Keep it aligned with RACE_REFRESH_SECONDS below.
export const revalidate = 60;

export async function GET() {
  // `getRaceEvents` never throws, and an empty list is a real answer — a
  // region with no races on the calendar is the normal case, not a failure.
  const events = await getRaceEvents();

  return NextResponse.json(
    { events },
    {
      headers: {
        'Cache-Control': `public, max-age=${RACE_REFRESH_SECONDS}, stale-while-revalidate=3600`,
      },
    },
  );
}
