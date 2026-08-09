import { describe, expect, it } from 'vitest';
import { SPARK_POINTS, sparkPath, toSpark } from './trail-spark';

/** [distanceFt, elevationFt, lng, lat] — the stored profile's shape. */
function profile(elevations: number[]): [number, number, number, number][] {
  return elevations.map((e, i) => [i * 100, e, -121, 44]);
}

describe('toSpark', () => {
  it('returns a fixed number of points whatever the input length', () => {
    expect(toSpark(profile([0, 10, 20, 30]))).toHaveLength(SPARK_POINTS);
    const long = Array.from({ length: 2000 }, (_, i) => i);
    expect(toSpark(profile(long))).toHaveLength(SPARK_POINTS);
  });

  it('normalises to 0 at the low point and 1 at the high', () => {
    const spark = toSpark(profile([100, 200, 300]));
    expect(spark[0]).toBe(0);
    expect(spark[spark.length - 1]).toBe(1);
  });

  it('keeps the shape, not just the endpoints', () => {
    // A climb then a descent must read as a peak in the middle.
    const up = Array.from({ length: 50 }, (_, i) => i);
    const down = Array.from({ length: 50 }, (_, i) => 50 - i);
    const spark = toSpark(profile([...up, ...down]));
    const mid = spark[Math.floor(spark.length / 2)];
    expect(mid).toBeGreaterThan(spark[0]);
    expect(mid).toBeGreaterThan(spark[spark.length - 1]);
  });

  it('draws nothing for a flat trail', () => {
    // A straight line implies a measurement; it is indistinguishable from a
    // broken chart, so render none at all.
    expect(toSpark(profile([500, 500, 500, 500]))).toEqual([]);
  });

  it('draws nothing without a usable profile', () => {
    expect(toSpark(undefined)).toEqual([]);
    expect(toSpark([])).toEqual([]);
    expect(toSpark(profile([100]))).toEqual([]);
  });

  it('survives a profile carrying junk', () => {
    const dirty = profile([100, 200, 300]);
    dirty[1][1] = Number.NaN;
    expect(() => toSpark(dirty)).not.toThrow();
  });
});

describe('sparkPath', () => {
  it('starts with a move and stays inside the box', () => {
    const path = sparkPath([0, 0.5, 1], 52, 22);
    expect(path?.line.startsWith('M0.0 22.0')).toBe(true);
    // A value of 1 is the top of the box, which is y = 0.
    expect(path?.line).toContain('52.0 0.0');
  });

  it('closes the area back along the baseline', () => {
    expect(sparkPath([0, 1], 52, 22)?.area.endsWith('L52 22 L0 22 Z')).toBe(
      true,
    );
  });

  it('returns null when there is nothing to draw', () => {
    expect(sparkPath([], 52, 22)).toBeNull();
    expect(sparkPath([0.5], 52, 22)).toBeNull();
  });
});
