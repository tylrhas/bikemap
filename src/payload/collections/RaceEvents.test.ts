import { describe, expect, it } from 'vitest';
import { validateCheckpoints, validateCourseGpx } from './RaceEvents';

function row(mile: number, lead: string) {
  return {
    isCutoff: false,
    label: `Mile ${mile}`,
    leadEta: lead,
    mile,
    sweepEta: lead,
  };
}

describe('validateCheckpoints', () => {
  it('accepts a course that climbs in order', () => {
    expect(
      validateCheckpoints([
        row(0, '2026-08-15T15:00:00Z'),
        row(10, '2026-08-15T17:00:00Z'),
        row(20, '2026-08-15T19:00:00Z'),
      ]),
    ).toBe(true);
  });

  it('insists on a start and a finish', () => {
    // Two points is already a straight-line guess across the whole course;
    // one is not a course at all.
    expect(validateCheckpoints([])).toContain('start and a finish');
    expect(validateCheckpoints([row(0, '2026-08-15T15:00:00Z')])).toContain(
      'start and a finish',
    );
  });

  it('rejects a checkpoint that goes backwards down the course', () => {
    expect(
      validateCheckpoints([
        row(10, '2026-08-15T15:00:00Z'),
        row(5, '2026-08-15T17:00:00Z'),
      ]),
    ).toContain('not further along');
  });

  it('rejects leaders arriving earlier further along', () => {
    expect(
      validateCheckpoints([
        row(0, '2026-08-15T17:00:00Z'),
        row(10, '2026-08-15T15:00:00Z'),
      ]),
    ).toContain('the leaders arriving before an earlier checkpoint');
  });

  it('accepts a course with no times at all', () => {
    // Places first: an organizer knows where the aid stations are long before
    // anyone has estimated when the field reaches them.
    expect(
      validateCheckpoints([
        { label: 'Start', mile: 0 },
        { label: 'Finish', mile: 12 },
      ]),
    ).toBe(true);
  });

  it('accepts a gap in one series', () => {
    expect(
      validateCheckpoints([
        { label: 'Start', leadEta: '2026-08-15T15:00:00Z', mile: 0 },
        { label: 'Aid', mile: 5 },
        { label: 'Finish', leadEta: '2026-08-15T19:00:00Z', mile: 12 },
      ]),
    ).toBe(true);
  });

  it('still catches a time going backwards across a gap', () => {
    // The trap a naive neighbour comparison falls into: `Date.parse(undefined)`
    // is NaN and every comparison with NaN is false, so the blank row in the
    // middle would hide the finish arriving before the start.
    expect(
      validateCheckpoints([
        { label: 'Start', leadEta: '2026-08-15T19:00:00Z', mile: 0 },
        { label: 'Aid', mile: 5 },
        { label: 'Finish', leadEta: '2026-08-15T15:00:00Z', mile: 12 },
      ]),
    ).toContain('the leaders arriving before an earlier checkpoint');
  });

  it('checks the sweep the same way as the lead', () => {
    expect(
      validateCheckpoints([
        { label: 'Start', mile: 0, sweepEta: '2026-08-15T19:00:00Z' },
        { label: 'Finish', mile: 12, sweepEta: '2026-08-15T15:00:00Z' },
      ]),
    ).toContain('the sweep arriving before an earlier checkpoint');
  });
});

describe('validateCourseGpx', () => {
  const line = {
    coordinates: [
      [-121.3, 44.05],
      [-121.29, 44.06],
    ],
    type: 'LineString',
  };

  it('is optional — blank means use the trail’s own line', () => {
    expect(validateCourseGpx(null)).toBe(true);
    expect(validateCourseGpx(undefined)).toBe(true);
    expect(validateCourseGpx('')).toBe(true);
  });

  it('takes a bare LineString or a Feature wrapping one', () => {
    // geojson.io hands back the second shape, and rejecting it would read as
    // the field being broken.
    expect(validateCourseGpx(line)).toBe(true);
    expect(
      validateCourseGpx({ geometry: line, properties: {}, type: 'Feature' }),
    ).toBe(true);
  });

  it('rejects anything that is not a line', () => {
    expect(
      validateCourseGpx({ coordinates: [-121, 44], type: 'Point' }),
    ).toContain('LineString');
  });

  it('rejects a line that is one point, or off the planet', () => {
    expect(
      validateCourseGpx({ coordinates: [[-121, 44]], type: 'LineString' }),
    ).toContain('two');
    expect(
      validateCourseGpx({
        coordinates: [
          [-400, 44],
          [-121, 44],
        ],
        type: 'LineString',
      }),
    ).toContain('range');
  });
});
