import type { ElevationProfile } from '@/data/geo_data';

export const CHART_HEIGHT = 100;
export const CHART_PADDING_TOP = 4;
export const CHART_PADDING_BOTTOM = 4;
export const PLOT_HEIGHT =
  CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

/** The first profile point at or beyond a cumulative distance in feet. */
export function indexAtDistanceFt(
  points: [number, number, number, number][],
  distanceFt: number,
): number | null {
  if (points.length === 0) return null;

  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid][0] < distanceFt) lo = mid + 1;
    else hi = mid;
  }
  return Math.max(0, Math.min(lo, points.length - 1));
}

/** Maps a profile sample to the elevation chart's SVG coordinate system. */
export function profilePointToXY(
  points: [number, number, number, number][],
  index: number,
  profile: ElevationProfile,
  chartWidth: number,
): { x: number; y: number } {
  const maxDist = points[points.length - 1][0];
  const yRange = profile.max - profile.min || 1;
  return {
    x: (points[index][0] / maxDist) * chartWidth,
    y:
      CHART_PADDING_TOP +
      PLOT_HEIGHT -
      ((points[index][1] - profile.min) / yRange) * PLOT_HEIGHT,
  };
}
