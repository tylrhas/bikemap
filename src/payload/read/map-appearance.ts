import 'server-only';

/**
 * The public map's brand: colors as CSS, plus the identity the header draws.
 *
 * **Never throws**, the same rule as `getCityTrails` — a theme row
 * must never be able to take the map down. Anything unreadable falls
 * through to the defaults in `globals.css` and `site.config.ts`.
 *
 * The shaping itself lives in `@/data/brand`, free of Payload, so it stays
 * testable; this half only fetches.
 */
import { getPayload } from 'payload';
import config from '@payload-config';
import {
  type Brand,
  brandIdentity,
  buildAppearanceCss,
  safeUrl,
} from '@/data/brand';

export interface MapBrand {
  /** A `:root` block, or '' when nothing usable is saved. */
  css: string;
  /** Stylesheet defining the chosen fonts, or null. */
  fontUrl: null | string;
  logoUrl: null | string;
  wordmark: null | string;
}

const NOTHING_SAVED: MapBrand = {
  css: '',
  fontUrl: null,
  logoUrl: null,
  wordmark: null,
};

export async function getMapBrand(): Promise<MapBrand> {
  if (!process.env.DATABASE_URL) {
    return NOTHING_SAVED;
  }

  try {
    const payload = await getPayload({ config });
    const doc = (await payload.findGlobal({
      slug: 'map-appearance',
      depth: 0,
    })) as Brand;

    if (!doc) {
      return NOTHING_SAVED;
    }

    return {
      css: buildAppearanceCss(doc),
      fontUrl: safeUrl(doc.fontUrl),
      ...brandIdentity(doc),
    };
  } catch (error) {
    console.error('Could not read the map appearance; using defaults.', error);
    return NOTHING_SAVED;
  }
}
