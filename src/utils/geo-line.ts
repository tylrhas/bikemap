/**
 * Walking a `[lng, lat]` polyline by distance: how long it is, where you are a
 * given number of metres along it, and which way it is heading there.
 *
 * Its own file rather than an addition to `map.ts`, which is already large and
 * imports mapbox-gl — everything here is pure and runs with no map. It is also
 * not `ride-stats.ts` (a recorded ride), `osm-elevation.ts` (terrain sampling)
 * or `svg.ts` (mercator projection); none of those is about arc length.
 *
 * **These take raw coordinates, not the elevation profile's tuple.** A course
 * pasted in as GPX has no profile at all, and the profile's first element is
 * *feet* of terrain-sampled distance — threading feet through a metres API is
 * the same class of bug as the argument order below.
 */

import { METERS_PER_MILE } from './format';
import { haversineDistance } from './ride-stats';

/**
 * ~1.5 miles between direction arrows. Close enough that a rider joining the
 * course mid-way meets one soon, far enough that they don't become a texture.
 */
export const ARROW_SPACING_METERS = 1.5 * METERS_PER_MILE;

/** Keep arrows clear of the start and finish markers. */
export const ARROW_EDGE_METERS = 0.25 * METERS_PER_MILE;

/**
 * `haversineDistance` takes **latitude first**, while every coordinate in this
 * app is `[lng, lat]`. Flipped in exactly one place so no call site has to
 * remember — see the asymmetric test, which is the only kind that catches it.
 */
function segmentMeters(a: [number, number], b: [number, number]): number {
  return haversineDistance(a[1], a[0], b[1], b[0]);
}

/** Metres from the first coordinate to each. Same length as `line`. */
export function cumulativeMeters(line: [number, number][]): number[] {
  const out: number[] = new Array(line.length);
  let total = 0;
  for (let i = 0; i < line.length; i++) {
    if (i > 0) {
      total += segmentMeters(line[i - 1], line[i]);
    }
    out[i] = total;
  }
  return out;
}

export function lineLengthMeters(line: [number, number][]): number {
  if (line.length < 2) {
    return 0;
  }
  let total = 0;
  for (let i = 1; i < line.length; i++) {
    total += segmentMeters(line[i - 1], line[i]);
  }
  return total;
}

/** Degrees clockwise from north, 0–360. */
export function bearingBetween(
  from: [number, number],
  to: [number, number],
): number {
  const toRad = Math.PI / 180;
  const lat1 = from[1] * toRad;
  const lat2 = to[1] * toRad;
  const dLng = (to[0] - from[0]) * toRad;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export interface LinePoint {
  /** Heading of the segment the point landed in. */
  bearing: number;
  /** Index of the segment's first vertex. */
  index: number;
  point: [number, number];
}

/**
 * The point `meters` along the line, interpolated inside the segment it lands
 * in. Clamped at both ends. Pass `cumulative` to avoid rebuilding it in a loop.
 */
export function pointAtDistance(
  line: [number, number][],
  meters: number,
  cumulative?: number[],
): LinePoint | null {
  if (line.length === 0) {
    return null;
  }
  if (line.length === 1) {
    return { bearing: 0, index: 0, point: line[0] };
  }

  const cum = cumulative ?? cumulativeMeters(line);
  const total = cum[cum.length - 1];
  const target = Math.min(Math.max(meters, 0), total);

  let i = 1;
  while (i < cum.length - 1 && cum[i] < target) {
    i++;
  }

  const from = line[i - 1];
  const to = line[i];
  const span = cum[i] - cum[i - 1];
  const fraction = span > 0 ? (target - cum[i - 1]) / span : 0;

  return {
    bearing: bearingBetween(from, to),
    index: i - 1,
    point: [
      from[0] + (to[0] - from[0]) * fraction,
      from[1] + (to[1] - from[1]) * fraction,
    ],
  };
}

/**
 * Points every `spacingMeters` **of arc length**, each with the local heading.
 *
 * Deliberately not `densifyLine` from `osm-elevation.ts`, which subdivides each
 * segment independently and starts over at every vertex — its spacing follows
 * how densely the line was drawn, which is fine for sampling terrain and wrong
 * for "an arrow every mile and a half". This carries the remainder across
 * vertices, so a stretch drawn with ten points and one drawn with two get the
 * same number of arrows.
 *
 * A course shorter than one spacing still gets a single arrow at its midpoint,
 * so even a short loop reads as directional.
 */
export function markersAlongLine(
  line: [number, number][],
  spacingMeters: number,
  edgeMeters = 0,
): { bearing: number; point: [number, number] }[] {
  if (line.length < 2 || spacingMeters <= 0) {
    return [];
  }

  const cum = cumulativeMeters(line);
  const total = cum[cum.length - 1];
  const usable = total - edgeMeters * 2;

  if (usable <= 0 || usable < spacingMeters) {
    const mid = pointAtDistance(line, total / 2, cum);
    return mid ? [{ bearing: mid.bearing, point: mid.point }] : [];
  }

  const out: { bearing: number; point: [number, number] }[] = [];
  const count = Math.floor(usable / spacingMeters);
  // Centre the run inside the usable stretch, so the gaps at each end match.
  const lead = edgeMeters + (usable - count * spacingMeters) / 2;

  for (let k = 0; k <= count; k++) {
    const at = pointAtDistance(line, lead + k * spacingMeters, cum);
    if (at) {
      out.push({ bearing: at.bearing, point: at.point });
    }
  }
  return out;
}

/** Halfway along by distance, not by vertex count. */
export function midpointOf(line: [number, number][]): [number, number] | null {
  if (line.length === 0) {
    return null;
  }
  return pointAtDistance(line, lineLengthMeters(line) / 2)?.point ?? null;
}
