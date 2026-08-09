/**
 * The tiny elevation shape drawn on a trail row.
 *
 * The list can't fetch a profile per trail — that is one request each, for a
 * few hundred trails — so the server downsamples the stored profile to a
 * handful of normalised points and sends them with the trail. Small enough to
 * ride along in the page payload, real enough to be worth looking at.
 *
 * It has to be the real profile. A shape derived from the climb total would
 * look identical and mean nothing, on a map people use to decide what to ride.
 *
 * Client-safe: no Node-only imports.
 */

/** Points kept per trail. Enough to read a shape, small enough to send. */
export const SPARK_POINTS = 24;

/**
 * Elevations normalised to 0–1, evenly sampled along the trail.
 *
 * Returns nothing for a trail with no usable profile, or one that is flat —
 * a straight line implies a measurement, and a flat sparkline is indisinguishable
 * from a broken one.
 */
export function toSpark(
  profile: [number, number, number, number][] | undefined,
): number[] {
  if (!Array.isArray(profile) || profile.length < 2) {
    return [];
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const point of profile) {
    const elevation = point[1];
    if (!Number.isFinite(elevation)) {
      continue;
    }
    if (elevation < min) min = elevation;
    if (elevation > max) max = elevation;
  }

  const range = max - min;
  if (!Number.isFinite(range) || range <= 0) {
    return [];
  }

  const step = (profile.length - 1) / (SPARK_POINTS - 1);
  const out: number[] = [];
  for (let i = 0; i < SPARK_POINTS; i++) {
    const elevation = profile[Math.round(i * step)]?.[1];
    const value = Number.isFinite(elevation) ? (elevation - min) / range : 0;
    // Three decimals is well past what a 26px-tall chart can show, and keeps
    // the payload from carrying float noise.
    out.push(Math.round(value * 1000) / 1000);
  }
  return out;
}

/**
 * An SVG `d` for the sparkline, and the same path closed into an area.
 *
 * Returns `null` when there is nothing to draw, so callers render no `<svg>`
 * rather than an empty one.
 */
export function sparkPath(
  values: number[],
  width: number,
  height: number,
): { area: string; line: string } | null {
  if (values.length < 2) {
    return null;
  }
  const step = width / (values.length - 1);
  const line = values
    .map(
      (value, i) =>
        `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)} ${(height - value * height).toFixed(1)}`,
    )
    .join(' ');
  return { area: `${line} L${width} ${height} L0 ${height} Z`, line };
}
