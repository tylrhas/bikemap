import { describe, expect, it } from 'vitest';
import {
  bearingBetween,
  cumulativeMeters,
  lineLengthMeters,
  markersAlongLine,
  midpointOf,
  pointAtDistance,
} from './geo-line';

/** A straight run east along the equator, where a degree is ~111.3 km. */
const EAST: [number, number][] = [
  [0, 0],
  [0.1, 0],
  [0.2, 0],
];

describe('cumulativeMeters', () => {
  it('runs from zero and never goes backwards', () => {
    const cum = cumulativeMeters(EAST);
    expect(cum[0]).toBe(0);
    expect(cum[1]).toBeGreaterThan(0);
    expect(cum[2]).toBeGreaterThan(cum[1]);
  });

  it('measures longitude and latitude differently', () => {
    // The regression test for the lat-first argument order of
    // `haversineDistance`. At latitude 60 a degree of longitude is about half
    // a degree of latitude — a swapped call returns the wrong one loudly,
    // where a symmetric case would pass either way.
    const eastAt60 = lineLengthMeters([
      [0, 60],
      [1, 60],
    ]);
    const northAt60 = lineLengthMeters([
      [0, 60],
      [0, 61],
    ]);
    expect(eastAt60).toBeGreaterThan(54_000);
    expect(eastAt60).toBeLessThan(57_000);
    expect(northAt60).toBeGreaterThan(110_000);
    expect(northAt60).toBeLessThan(112_000);
  });
});

describe('bearingBetween', () => {
  it('reads clockwise from north', () => {
    expect(bearingBetween([0, 0], [0, 1])).toBeCloseTo(0);
    expect(bearingBetween([0, 0], [1, 0])).toBeCloseTo(90);
    expect(bearingBetween([0, 0], [0, -1])).toBeCloseTo(180);
    expect(bearingBetween([0, 0], [-1, 0])).toBeCloseTo(270);
  });
});

describe('pointAtDistance', () => {
  it('interpolates inside the segment it lands in', () => {
    const total = lineLengthMeters(EAST);
    const at = pointAtDistance(EAST, total / 2);
    expect(at?.point[0]).toBeCloseTo(0.1, 4);
  });

  it('clamps at both ends', () => {
    expect(pointAtDistance(EAST, -100)?.point).toEqual([0, 0]);
    expect(pointAtDistance(EAST, 1e9)?.point[0]).toBeCloseTo(0.2, 6);
  });

  it('has nothing to return for an empty line', () => {
    expect(pointAtDistance([], 10)).toBeNull();
  });
});

describe('markersAlongLine', () => {
  it('spaces by distance, not by how densely the line was drawn', () => {
    // Ten vertices inside the first 100m, then two spanning 5km. Anything
    // stepping by index — or using `densifyLine`, which restarts its stepping
    // at every vertex — bunches the arrows into the dense stretch.
    const lumpy: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      lumpy.push([i * 0.0001, 0]);
    }
    lumpy.push([0.05, 0]);

    const spacing = 500;
    const points = markersAlongLine(lumpy, spacing);
    expect(points.length).toBeGreaterThan(5);

    const gaps: number[] = [];
    for (let i = 1; i < points.length; i++) {
      gaps.push(lineLengthMeters([points[i - 1].point, points[i].point]));
    }
    for (const gap of gaps) {
      expect(Math.abs(gap - spacing) / spacing).toBeLessThan(0.01);
    }
  });

  it('keeps clear of the ends', () => {
    const total = lineLengthMeters(EAST);
    const edge = 2000;
    const points = markersAlongLine(EAST, 3000, edge);
    const cum = cumulativeMeters(EAST);
    for (const point of points) {
      const along = lineLengthMeters([EAST[0], point.point]);
      expect(along).toBeGreaterThanOrEqual(edge - 1);
      expect(along).toBeLessThanOrEqual(cum[cum.length - 1] - edge + 1);
    }
    expect(total).toBeGreaterThan(edge * 2);
  });

  it('still gives a short course one arrow', () => {
    // A loop shorter than the spacing would otherwise read as directionless.
    const short: [number, number][] = [
      [0, 0],
      [0.001, 0],
    ];
    expect(markersAlongLine(short, 5000)).toHaveLength(1);
  });

  it('carries the heading of the segment it sits in', () => {
    const corner: [number, number][] = [
      [0, 0],
      [0, 0.2], // north
      [0.2, 0.2], // east
    ];
    const points = markersAlongLine(corner, 5000);
    expect(points.some((p) => Math.abs(p.bearing) < 5)).toBe(true);
    expect(points.some((p) => Math.abs(p.bearing - 90) < 5)).toBe(true);
  });

  it('has nothing to place on a degenerate line', () => {
    expect(markersAlongLine([[0, 0]], 100)).toEqual([]);
    expect(markersAlongLine(EAST, 0)).toEqual([]);
  });
});

describe('midpointOf', () => {
  it('halves by distance, not by vertex count', () => {
    // The middle vertex sits at 1% of the length; the midpoint must not.
    const lopsided: [number, number][] = [
      [0, 0],
      [0.001, 0],
      [0.1, 0],
    ];
    expect(midpointOf(lopsided)?.[0]).toBeCloseTo(0.05, 3);
  });

  it('has no midpoint for an empty line', () => {
    expect(midpointOf([])).toBeNull();
  });
});
