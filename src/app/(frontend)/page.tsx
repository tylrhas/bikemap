/**
 * The public map, rendered on the server so trail content comes from Payload.
 *
 * This is a server component: it reads the database through Payload's Local
 * API (a typed function call, no HTTP hop) and hands the result to the client
 * map as props. An editor's change is live on the next revalidation, with no
 * rebuild and no client-side fetch waterfall.
 *
 * If there is no database — or it's unreachable — `getCityTrails` returns an
 * empty list and the client falls back to the checked-in data in `src/data/`.
 * The public map keeps working either way.
 */
import type { ReactElement } from 'react';
import { activeCityId } from '@/config/map.config';
import { getMapBrand } from '@/payload/read/map-appearance';
import { getMapLayers } from '@/payload/read/map-layers';
import { getCityTrails } from '@/payload/read/trails';
import HomeClient from './HomeClient';

// Trail edits are rare and the payload is a few hundred rows, so serve a cached
// render and refresh it in the background rather than hitting the database on
// every request.
export const revalidate = 60;

export default async function Home(): Promise<ReactElement> {
  // The layout already injects the brand's colors and type as CSS. What it
  // can't inject is the header's name and logo, which are content — so they
  // come down as props, on the same never-throws read.
  const [{ trails }, { logoUrl, wordmark }, layers] = await Promise.all([
    getCityTrails(activeCityId),
    getMapBrand(),
    getMapLayers(),
  ]);

  return (
    <HomeClient brand={{ logoUrl, wordmark }} layers={layers} trails={trails} />
  );
}
