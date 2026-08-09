import 'server-only';

/**
 * The public map's brand colours as a CSS string.
 *
 * **Never throws**, the same rule as `getCityTrails` and `getThemeCss` — a
 * theme row must never be able to take the map down. Anything unreadable falls
 * through to the defaults in `globals.css`.
 *
 * The conversion itself lives in `@/data/brand-colors`, free of Payload, so it
 * stays testable; this half only fetches.
 */
import { getPayload } from 'payload';
import config from '@payload-config';
import { type BrandColors, buildAppearanceCss } from '@/data/brand-colors';

export async function getMapAppearanceCss(): Promise<string> {
  if (!process.env.DATABASE_URL) {
    return '';
  }

  try {
    const payload = await getPayload({ config });
    const doc = (await payload.findGlobal({
      slug: 'map-appearance',
      depth: 0,
    })) as BrandColors;

    return doc ? buildAppearanceCss(doc) : '';
  } catch (error) {
    console.error('Could not read the map appearance; using defaults.', error);
    return '';
  }
}
