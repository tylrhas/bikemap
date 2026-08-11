import { describe, expect, it } from 'vitest';
import type { RaceEvent as RaceEventRow, Trail } from '@/payload-types';
import { courseFor, MAX_COURSE_POINTS, raceEventFrom } from './race-shape';

// Rows are whatever a curator left behind, plus whatever the geometry pipeline
// wrote. Every case has to produce something the map can draw or honestly
// nothing at all — `getRaceEvents` must never throw.

const LINE = {
  coordinates: [
    [-121.3, 44.05],
    [-121.29, 44.06],
  ],
  type: 'LineString',
};

function trail(extra: Partial<Trail> = {}): Trail {
  return { id: 1, slug: 'phils-trail', ...extra } as Trail;
}

function row(extra: Partial<RaceEventRow> = {}): RaceEventRow {
  return {
    checkpoints: [
      {
        label: 'Start',
        leadEta: '2026-08-15T15:00:00Z',
        mile: 0,
        sweepEta: '2026-08-15T15:30:00Z',
      },
      {
        label: 'Finish',
        leadEta: '2026-08-15T18:00:00Z',
        mile: 12,
        sweepEta: '2026-08-15T21:00:00Z',
      },
    ],
    direction: 'forward',
    id: 7,
    name: 'Cascade Gravel Grinder',
    startsAt: '2026-08-15T15:00:00Z',
    trail: trail(),
    ...extra,
  } as RaceEventRow;
}

describe('courseFor', () => {
  it('prefers the organizer’s own line', () => {
    // The whole purpose of the field: the race does not always run the trail.
    const course = courseFor(
      row({ courseGpx: LINE }),
      trail({
        geom: {
          coordinates: [
            [0, 0],
            [1, 1],
          ],
          type: 'LineString',
        },
      }),
    );
    expect(course[0]).toEqual([-121.3, 44.05]);
  });

  it('falls back to the trail’s stored geometry', () => {
    expect(courseFor(row(), trail({ geom: LINE }))).toHaveLength(2);
  });

  it('takes a Feature wrapping a line, as geojson.io hands it over', () => {
    const feature = { geometry: LINE, properties: {}, type: 'Feature' };
    expect(courseFor(row({ courseGpx: feature }), null)).toHaveLength(2);
  });

  it('joins a MultiLineString rather than picking one piece', () => {
    // A trail stored in parts is still one course; taking the longest piece
    // would silently shorten it.
    const parts = {
      coordinates: [
        [
          [-121.3, 44.05],
          [-121.29, 44.06],
        ],
        [
          [-121.29, 44.06],
          [-121.28, 44.07],
        ],
      ],
      type: 'MultiLineString',
    };
    expect(courseFor(row(), trail({ geom: parts })).length).toBeGreaterThan(2);
  });

  it('falls back to the elevation profile’s coordinates', () => {
    // What covers a trail whose line lives in a Mapbox tileset rather than the
    // CMS: `measureParts` writes this series on every save regardless.
    const profile = {
      profile: [
        [0, 4000, -121.3, 44.05],
        [100, 4010, -121.29, 44.06],
      ],
    };
    expect(courseFor(row(), trail({ elevationProfile: profile }))).toEqual([
      [-121.3, 44.05],
      [-121.29, 44.06],
    ]);
  });

  it('returns nothing when there is no geometry anywhere', () => {
    // A real answer, not a failure — the map draws no event line and every other
    // surface still works.
    expect(courseFor(row(), trail())).toEqual([]);
    expect(courseFor(row(), null)).toEqual([]);
  });

  it('ignores geometry that is not a line', () => {
    expect(
      courseFor(row(), trail({ geom: { coordinates: [0, 0], type: 'Point' } })),
    ).toEqual([]);
    expect(courseFor(row({ courseGpx: 'nonsense' }), null)).toEqual([]);
  });

  it('downsamples a long course but keeps both ends', () => {
    const long = {
      coordinates: Array.from({ length: 9000 }, (_, i) => [
        -121.3 + i * 1e-5,
        44,
      ]),
      type: 'LineString',
    };
    const course = courseFor(row(), trail({ geom: long }));
    expect(course.length).toBeLessThanOrEqual(MAX_COURSE_POINTS + 1);
    expect(course[0]).toEqual([-121.3, 44]);
    expect(course.at(-1)).toEqual([
      Math.round((-121.3 + 8999 * 1e-5) * 1e6) / 1e6,
      44,
    ]);
  });
});

describe('raceEventFrom', () => {
  it('shapes a row into what the client joins on', () => {
    const event = raceEventFrom(row());
    expect(event?.trailSlug).toBe('phils-trail');
    expect(event?.id).toBe('7');
    expect(event?.checkpoints).toHaveLength(2);
  });

  it('drops a row whose trail did not resolve', () => {
    // A bare id at depth 1 means the trail is gone. Shipping it would give the
    // client a race that silently matches nothing.
    expect(raceEventFrom(row({ trail: 42 as unknown as Trail }))).toBeNull();
    // `slug` is a required column, so a blank is the shape a half-written row
    // actually takes.
    expect(raceEventFrom(row({ trail: trail({ slug: '' }) }))).toBeNull();
  });

  it('drops a row that cannot describe a course', () => {
    expect(raceEventFrom(row({ checkpoints: [] }))).toBeNull();
  });

  it('keeps a checkpoint for its mile, times or not', () => {
    // A checkpoint is a place first. Dropping the untimed ones would take the
    // aid stations off the chart because nobody had estimated a clock yet.
    const event = raceEventFrom(
      row({
        checkpoints: [
          { label: 'Start', mile: 0 },
          { label: 'Aid', mile: 5 },
        ],
      } as Partial<RaceEventRow>),
    );
    expect(event?.checkpoints).toHaveLength(2);
    expect(event?.checkpoints[0].leadEta).toBeNull();
    expect(event?.checkpoints[0].sweepEta).toBeNull();
  });

  it('nulls an unreadable date rather than dropping the checkpoint', () => {
    const event = raceEventFrom(
      row({
        checkpoints: [
          { label: 'Start', leadEta: 'nope', mile: 0, sweepEta: 'nope' },
          { label: 'End', leadEta: 'nope', mile: 5, sweepEta: 'nope' },
        ],
      } as Partial<RaceEventRow>),
    );
    expect(event?.checkpoints).toHaveLength(2);
    expect(event?.checkpoints[1].leadEta).toBeNull();
  });

  it('sorts checkpoints and squares up the loose ends', () => {
    const event = raceEventFrom(
      row({
        checkpoints: [
          {
            label: 'Finish',
            leadEta: '2026-08-15T18:00:00Z',
            mile: 12,
            sweepEta: '2026-08-15T21:00:00Z',
          },
          {
            label: 'Start',
            leadEta: '2026-08-15T15:00:00Z',
            mile: 0,
            sweepEta: '2026-08-15T15:30:00Z',
          },
        ],
      } as Partial<RaceEventRow>),
    );
    expect(event?.checkpoints.map((c) => c.mile)).toEqual([0, 12]);
    // `isCutoff` is nullable in the database and a real boolean on the wire.
    expect(event?.checkpoints[0].isCutoff).toBe(false);
    expect(event?.originLabel).toBe('');
  });

  it('defaults an unreadable direction to forward', () => {
    expect(
      raceEventFrom(row({ direction: 'sideways' as 'forward' }))?.direction,
    ).toBe('forward');
  });
});
