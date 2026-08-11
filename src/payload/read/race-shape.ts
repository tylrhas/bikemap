/**
 * How a stored race event becomes what the public map reads.
 *
 * Separate from `race-events.ts`, and without `server-only`, for the same
 * reason `appearance.ts` is separate from `trails.ts`: all the judgement is
 * here, and it tests without a database.
 *
 * The work beyond renaming fields is resolving the **course line**. The client
 * needs coordinates in hand — to space arrows by distance, to place the
 * endpoints and the flag — and `querySourceFeatures` only ever returns tiles
 * currently in view, so the map cannot recover them itself. Doing it here also
 * means the `courseGpx` override costs the client nothing.
 */
import type { RaceCheckpoint, RaceEvent } from '@/data/race-events';
import { stitchLines } from '@/utils/osm-elevation';
import type { RaceEvent as RaceEventRow, Trail } from '@/payload-types';

/**
 * A long course sampled every 20m runs to tens of thousands of points, and the
 * overlay is only a few pixels wide — nobody can see the difference. Six
 * decimals is about 11cm.
 */
export const MAX_COURSE_POINTS = 2000;
const COORD_PRECISION = 1e6;

/**
 * At depth 1 the relationship arrives as its document — but only while the row
 * still points at one. Same unwrap `conditions.ts` does.
 */
function trailOf(row: RaceEventRow): Trail | null {
  return row.trail && typeof row.trail === 'object' ? row.trail : null;
}

function isPosition(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(Number(value[0])) &&
    Number.isFinite(Number(value[1]))
  );
}

function toLine(value: unknown): [number, number][] {
  return Array.isArray(value)
    ? value.filter(isPosition).map((p) => [Number(p[0]), Number(p[1])])
    : [];
}

/** A LineString or a Feature wrapping one, as validated on the way in. */
function lineFromGeoJson(value: unknown): [number, number][] {
  if (!value || typeof value !== 'object') {
    return [];
  }
  const geometry = (value as { geometry?: unknown }).geometry ?? value;
  const { coordinates, type } = geometry as {
    coordinates?: unknown;
    type?: unknown;
  };

  if (type === 'LineString') {
    return toLine(coordinates);
  }
  if (type === 'MultiLineString' && Array.isArray(coordinates)) {
    // Join the pieces rather than picking one: a trail stored in parts is still
    // one course, and taking the longest piece would silently shorten it.
    return stitchLines(coordinates.map(toLine).filter((l) => l.length >= 2));
  }
  return [];
}

/** `[distFt, elevFt, lng, lat]` -> `[lng, lat]`. */
function lineFromProfile(value: unknown): [number, number][] {
  if (!value || typeof value !== 'object') {
    return [];
  }
  const points = (value as { profile?: unknown }).profile;
  if (!Array.isArray(points)) {
    return [];
  }
  return points
    .filter((p) => Array.isArray(p) && p.length >= 4)
    .map((p) => [Number(p[2]), Number(p[3])] as [number, number])
    .filter(isPosition);
}

function shrink(line: [number, number][]): [number, number][] {
  const round = (n: number) =>
    Math.round(n * COORD_PRECISION) / COORD_PRECISION;
  if (line.length <= MAX_COURSE_POINTS) {
    return line.map(([lng, lat]) => [round(lng), round(lat)]);
  }
  // Keep both ends: dropping either pulls an endpoint marker off the trailhead,
  // which is the one place a rider checks the map against the ground.
  const step = Math.ceil(line.length / MAX_COURSE_POINTS);
  const out: [number, number][] = [];
  for (let i = 0; i < line.length; i += step) {
    out.push([round(line[i][0]), round(line[i][1])]);
  }
  const last = line[line.length - 1];
  out.push([round(last[0]), round(last[1])]);
  return out;
}

/**
 * The line the race is run on.
 *
 * In order: the organizer's own GPX, then the trail's stored geometry, then the
 * coordinates carried by its elevation profile — which is what covers a trail
 * whose line lives in a Mapbox tileset rather than the CMS, since
 * `measureParts` writes a full `[lng, lat]` series on every save regardless.
 *
 * An empty result is a real answer: the map draws no event line, and the tag,
 * banner, spread card and hover estimate all still work, because none of them
 * needs the line.
 */
export function courseFor(
  row: RaceEventRow,
  trail: Trail | null,
): [number, number][] {
  const fromGpx = lineFromGeoJson(row.courseGpx);
  if (fromGpx.length >= 2) {
    return shrink(fromGpx);
  }
  const fromGeom = lineFromGeoJson(trail?.geom);
  if (fromGeom.length >= 2) {
    return shrink(fromGeom);
  }
  const fromProfile = lineFromProfile(trail?.elevationProfile);
  return fromProfile.length >= 2 ? shrink(fromProfile) : [];
}

/** An ISO string, or null for a blank or unreadable date. */
function isoOrNull(value: unknown): null | string {
  const at = Date.parse(String(value));
  return Number.isFinite(at) ? new Date(at).toISOString() : null;
}

/**
 * A checkpoint is kept for its **mile**, not its times.
 *
 * Both times are optional — an organizer knows where the aid stations are long
 * before anyone has estimated when the field reaches them — so a row without
 * them is still a place worth marking on the chart. Only a row with no readable
 * distance has nothing to contribute.
 */
function toCheckpoints(row: RaceEventRow): RaceCheckpoint[] {
  return (row.checkpoints ?? [])
    .filter((cp) => Number.isFinite(Number(cp.mile)))
    .map((cp) => ({
      isCutoff: cp.isCutoff === true,
      label: cp.label ?? '',
      leadEta: isoOrNull(cp.leadEta),
      mile: Number(cp.mile),
      sweepEta: isoOrNull(cp.sweepEta),
    }))
    .sort((a, b) => a.mile - b.mile);
}

/**
 * `null` for a row nothing could show: no trail slug to join on, no start, or
 * fewer than the two checkpoints a course needs. Dropping it beats shipping a
 * race that silently matches no trail.
 */
export function raceEventFrom(row: RaceEventRow): RaceEvent | null {
  const trail = trailOf(row);
  const trailSlug = trail?.slug;
  if (!trailSlug || !row.startsAt || !row.name) {
    return null;
  }
  const checkpoints = toCheckpoints(row);
  if (checkpoints.length < 2) {
    return null;
  }

  return {
    checkpoints,
    course: courseFor(row, trail),
    direction: row.direction === 'reverse' ? 'reverse' : 'forward',
    id: String(row.id),
    name: row.name,
    originLabel: row.originLabel ?? '',
    startsAt: new Date(row.startsAt).toISOString(),
    terminusLabel: row.terminusLabel ?? '',
    trailSlug,
  };
}
