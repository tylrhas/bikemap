import 'server-only';

/**
 * Which optional layers this deployment offers.
 *
 * **Never throws**, the same rule as `getCityTrails` and `getMapBrand`. No
 * database, an unreachable one, or an unset global all return the shipped
 * defaults — losing the CMS must not take a layer away from the map.
 */
import { getPayload } from 'payload';
import config from '@payload-config';
import { DEFAULT_MAP_LAYERS, type MapLayerSettings } from '@/data/map-layers';

export async function getMapLayers(): Promise<MapLayerSettings> {
  if (!process.env.DATABASE_URL) {
    return DEFAULT_MAP_LAYERS;
  }

  try {
    const payload = await getPayload({ config });
    const doc = (await payload.findGlobal({
      slug: 'map-layers',
      depth: 0,
    })) as Partial<MapLayerSettings> | null;

    // A global that has never been saved comes back without the field rather
    // than with its default, so an explicit `false` is the only thing that
    // turns a layer off.
    return { osmTrails: doc?.osmTrails !== false };
  } catch (error) {
    console.error(
      'Could not read the map layers; offering all of them.',
      error,
    );
    return DEFAULT_MAP_LAYERS;
  }
}
