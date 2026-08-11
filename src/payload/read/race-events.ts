import 'server-only';

/**
 * Reads race events out of Payload for the public map.
 *
 * **Never throws**, the same contract as `trails.ts` and `conditions.ts`: a
 * race is something extra on a map that works without one, so a database
 * hiccup costs a badge rather than the page.
 *
 * The shaping — and the course-line resolution, which is the only part with any
 * judgement in it — lives in `race-shape.ts` so it can be tested without a
 * database, exactly as `appearance.ts` sits beside `trails.ts`.
 */
import { getPayload } from 'payload';
import config from '@payload-config';
import { activeCityId } from '@/config/map.config';
import { RACE_PREVIEW_DAYS, type RaceEvent } from '@/data/race-events';
import { raceEventFrom } from './race-shape';

const MS_PER_DAY = 86_400_000;

/**
 * Races worth sending to the client.
 *
 * The window is **coarse and generous on purpose** — a day either side of
 * anything the client could possibly show. Filtering to the exact phase here
 * would make the response depend on the wall clock, which defeats the route's
 * cache; the client decides `today` against `upcoming` from one shared instant
 * instead, and re-decides it when the day rolls over.
 */
export async function getRaceEvents(): Promise<RaceEvent[]> {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  try {
    const payload = await getPayload({ config });
    const now = Date.now();
    const result = await payload.find({
      collection: 'race-events',
      // 1 so `trail` resolves to its document — the slug everything joins on
      // and the fallback course geometry both come off it.
      depth: 1,
      limit: 100,
      pagination: false,
      sort: 'startsAt',
      where: {
        and: [
          { city: { equals: activeCityId } },
          { finished: { not_equals: true } },
          {
            startsAt: {
              greater_than: new Date(now - MS_PER_DAY).toISOString(),
            },
          },
          {
            startsAt: {
              less_than: new Date(
                now + (RACE_PREVIEW_DAYS + 1) * MS_PER_DAY,
              ).toISOString(),
            },
          },
        ],
      },
    });

    return result.docs
      .map(raceEventFrom)
      .filter((event): event is RaceEvent => event !== null);
  } catch (error) {
    // The map must survive the CMS being down. Log loudly, show no races.
    console.error('Could not read race events from Payload.', error);
    return [];
  }
}
