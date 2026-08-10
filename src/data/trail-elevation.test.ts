import { describe, expect, it } from 'vitest';
import {
  dominantElevation,
  elevationFigures,
  formatElevationChange,
} from './trail-elevation';

describe('elevationFigures', () => {
  it('describes a descent as a descent', () => {
    // 50 Shades of Blue: 116 feet down in a quarter mile, no climbing at all.
    // It used to render nothing, because zero is falsy.
    expect(elevationFigures({ elevationGain: 0, elevationLoss: 116 })).toEqual({
      climb: null,
      descent: 116,
    });
  });

  it('drops a figure that is a rounding error beside the other', () => {
    // Larison Rock. "+11 ft" beside a 2,111-foot descent says something false
    // about the ride.
    expect(
      elevationFigures({ elevationGain: 11, elevationLoss: 2111 }),
    ).toEqual({ climb: null, descent: 2111 });
  });

  it('keeps both when both are part of the ride', () => {
    // Olallie: 1,106 up and 2,956 down. The climbing is more than a third of
    // the descent and a rider planning it needs to know.
    expect(
      elevationFigures({ elevationGain: 1106, elevationLoss: 2956 }),
    ).toEqual({ climb: 1106, descent: 2956 });
  });

  it('keeps both on a loop, which measures about even', () => {
    expect(
      elevationFigures({ elevationGain: 800, elevationLoss: 795 }),
    ).toEqual({ climb: 800, descent: 795 });
  });

  it('describes a climb as a climb', () => {
    expect(
      elevationFigures({ elevationGain: 1500, elevationLoss: 60 }),
    ).toEqual({ climb: 1500, descent: null });
  });

  it('has nothing to say about a trail with no measurements', () => {
    expect(elevationFigures({})).toEqual({ climb: null, descent: null });
    expect(elevationFigures({ elevationGain: 0, elevationLoss: 0 })).toEqual({
      climb: null,
      descent: null,
    });
  });
});

describe('dominantElevation', () => {
  it('takes the direction the trail mostly goes', () => {
    expect(
      dominantElevation({ elevationGain: 11, elevationLoss: 2111 }),
    ).toEqual({ direction: 'down', feet: 2111 });
    expect(
      dominantElevation({ elevationGain: 1500, elevationLoss: 60 }),
    ).toEqual({ direction: 'up', feet: 1500 });
  });

  it('gives a tie to climbing', () => {
    // What a rider wants to know about a loop is what it costs them.
    expect(
      dominantElevation({ elevationGain: 800, elevationLoss: 800 }),
    ).toEqual({ direction: 'up', feet: 800 });
  });

  it('is null when there is nothing measured', () => {
    expect(dominantElevation({})).toBeNull();
    expect(
      dominantElevation({ elevationGain: 0, elevationLoss: 0 }),
    ).toBeNull();
  });
});

describe('formatElevationChange', () => {
  it('signs the number and groups the thousands', () => {
    expect(formatElevationChange(2111, 'down')).toBe('−2,111 ft');
    expect(formatElevationChange(1500, 'up')).toBe('+1,500 ft');
  });

  it('uses a real minus sign, not a hyphen', () => {
    // A hyphen is narrower than the plus it lines up against in a column.
    expect(formatElevationChange(10, 'down').startsWith('−')).toBe(true);
  });
});
