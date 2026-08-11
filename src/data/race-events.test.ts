import { describe, expect, it } from 'vitest';
import type { RaceCheckpoint } from './race-events';
import {
  bracketFor,
  directionLabel,
  etaAtMile,
  etaSentence,
  formatClock,
  formatSpread,
  hasEstimates,
  racePhase,
  raceTagLabel,
  spreadBuckets,
} from './race-events';

// Every clock assertion names a zone. Left to the default they would pass on a
// laptop in one timezone and fail in CI in another.
const TZ = 'America/Los_Angeles';

function cp(
  mile: number,
  lead: null | string,
  sweep: null | string,
  extra: Partial<RaceCheckpoint> = {},
): RaceCheckpoint {
  return {
    isCutoff: false,
    label: `Mile ${mile}`,
    leadEta: lead,
    mile,
    sweepEta: sweep,
    ...extra,
  };
}

/** A 30-mile race starting 8am Pacific, the field spreading as it goes. */
const COURSE: RaceCheckpoint[] = [
  cp(0, '2026-08-15T15:00:00Z', '2026-08-15T15:30:00Z'), // 8:00–8:30am
  cp(10, '2026-08-15T17:00:00Z', '2026-08-15T19:00:00Z'), // 10:00am–12:00pm
  cp(20, '2026-08-15T19:00:00Z', '2026-08-15T23:00:00Z', {
    isCutoff: true,
    label: 'Aid 2',
  }),
  cp(30, '2026-08-15T21:00:00Z', '2026-08-16T03:00:00Z'),
];

const EVENT = { checkpoints: COURSE };

describe('bracketFor', () => {
  it('finds the pair a mile sits between', () => {
    const bracket = bracketFor(COURSE, 15);
    expect(bracket?.from.mile).toBe(10);
    expect(bracket?.to.mile).toBe(20);
    expect(bracket?.fraction).toBeCloseTo(0.5);
  });

  it('clamps before the first checkpoint rather than extrapolating', () => {
    // Running the line backwards would invent a time before the race started.
    const bracket = bracketFor(COURSE, -5);
    expect(bracket?.from.mile).toBe(0);
    expect(bracket?.fraction).toBe(0);
  });

  it('clamps past the last checkpoint', () => {
    const bracket = bracketFor(COURSE, 999);
    expect(bracket?.to.mile).toBe(30);
    expect(bracket?.fraction).toBe(1);
  });

  it('does not care what order the checkpoints arrive in', () => {
    const shuffled = [COURSE[2], COURSE[0], COURSE[3], COURSE[1]];
    expect(bracketFor(shuffled, 15)).toEqual(bracketFor(COURSE, 15));
  });

  it('drops a checkpoint with an unreadable mile or date', () => {
    const poisoned = [...COURSE, cp(Number.NaN, 'nonsense', 'nonsense')];
    expect(bracketFor(poisoned, 15)).toEqual(bracketFor(COURSE, 15));
  });

  it('refuses to work from fewer than two timed checkpoints', () => {
    // One point cannot describe a course: interpolation would report the start
    // time at every mile, telling a rider at mile 40 the leaders are due at 8am.
    expect(bracketFor([], 5)).toBeNull();
    expect(bracketFor([COURSE[0]], 5)).toBeNull();
  });

  it('brackets each series over the checkpoints that carry it', () => {
    // A missing sweep in the middle leaves a hole in the sweep line only.
    const patchy = [
      cp(0, '2026-08-15T15:00:00Z', '2026-08-15T15:30:00Z'),
      cp(10, '2026-08-15T17:00:00Z', null),
      cp(20, '2026-08-15T19:00:00Z', '2026-08-15T23:00:00Z'),
    ];
    expect(bracketFor(patchy, 15, 'leadEta')?.from.mile).toBe(10);
    // The sweep series skips mile 10 entirely, so 15 sits in the 0–20 span.
    expect(bracketFor(patchy, 15, 'sweepEta')?.from.mile).toBe(0);
    expect(bracketFor(patchy, 15, 'sweepEta')?.to.mile).toBe(20);
  });
});

describe('etaAtMile', () => {
  it('interpolates between the bracketing checkpoints', () => {
    const eta = etaAtMile(EVENT, 15);
    // Halfway from 10:00am to 12:00pm, and from 12:00pm to 4:00pm.
    expect(formatClock(eta!.lead!, TZ)).toBe('11:00am');
    expect(formatClock(eta!.sweep!, TZ)).toBe('2:00pm');
    expect(eta!.spreadMinutes).toBe(180);
  });

  it('pins to a checkpoint when the mile is on one', () => {
    const eta = etaAtMile(EVENT, 20);
    expect(eta!.exact).toBe(true);
    expect(eta!.lead).toBe(COURSE[2].leadEta);
    expect(eta!.sweep).toBe(COURSE[2].sweepEta);
  });

  it('flags a cutoff only on a checkpoint that is one', () => {
    expect(etaAtMile(EVENT, 20)!.cutoff).toBe(true);
    expect(etaAtMile(EVENT, 10)!.cutoff).toBe(false); // exact, not a cutoff
    expect(etaAtMile(EVENT, 15)!.cutoff).toBe(false); // interpolated
  });

  it('does not call a clamped reading exact', () => {
    // A mile off the end of the course produces fraction 0 or 1, but there is
    // nothing exact about the answer there.
    expect(etaAtMile(EVENT, -5)!.exact).toBe(false);
    expect(etaAtMile(EVENT, 999)!.exact).toBe(false);
  });

  it('interpolates across midnight', () => {
    // 22:30 to 01:15 the next day. Anything doing this in minutes-past-midnight
    // wraps and lands in the morning; halfway here is 11:52pm.
    const overnight = {
      checkpoints: [
        cp(0, '2026-08-16T05:30:00Z', '2026-08-16T05:30:00Z'), // 10:30pm
        cp(10, '2026-08-16T08:15:00Z', '2026-08-16T08:15:00Z'), // 1:15am
      ],
    };
    expect(formatClock(etaAtMile(overnight, 5)!.lead!, TZ)).toBe('11:52pm');
  });

  it('reports no spread when the field passes together', () => {
    const together = {
      checkpoints: [
        cp(0, '2026-08-15T15:00:00Z', '2026-08-15T15:00:00Z'),
        cp(10, '2026-08-15T17:00:00Z', '2026-08-15T17:00:00Z'),
      ],
    };
    expect(etaAtMile(together, 5)!.spreadMinutes).toBe(0);
  });

  it('returns null rather than throwing when there is nothing to read', () => {
    expect(etaAtMile({ checkpoints: [] }, 5)).toBeNull();
    expect(etaAtMile({ checkpoints: [cp(0, 'nope', 'nope')] }, 5)).toBeNull();
  });
});

describe('checkpoints with only some of the times', () => {
  const UNTIMED = [cp(0, null, null), cp(10, null, null)];

  it('says nothing at all when no times were entered', () => {
    // The places are still worth marking on the chart; the estimate is not
    // something to invent.
    expect(etaAtMile({ checkpoints: UNTIMED }, 5)).toBeNull();
    expect(hasEstimates({ checkpoints: UNTIMED })).toBe(false);
  });

  it('gives a lead time when only leads were entered', () => {
    const leadsOnly = {
      checkpoints: [
        cp(0, '2026-08-15T15:00:00Z', null),
        cp(10, '2026-08-15T17:00:00Z', null),
      ],
    };
    const eta = etaAtMile(leadsOnly, 5);
    expect(formatClock(eta!.lead!, TZ)).toBe('9:00am');
    expect(eta!.sweep).toBeNull();
    // A spread needs two numbers.
    expect(eta!.spreadMinutes).toBeNull();
    expect(hasEstimates(leadsOnly)).toBe(true);
  });

  it('says only what it knows, rather than padding out a range', () => {
    const leadsOnly = {
      checkpoints: [
        cp(0, '2026-08-15T15:00:00Z', null),
        cp(10, '2026-08-15T17:00:00Z', null),
      ],
    };
    const sentence = etaSentence(etaAtMile(leadsOnly, 5)!, 5, TZ);
    expect(sentence).toContain('leaders through around 9:00am');
    expect(sentence).not.toContain('–');
    expect(sentence).not.toContain('spread');
  });

  it('carries a lead across a checkpoint that only has a sweep', () => {
    const patchy = {
      checkpoints: [
        cp(0, '2026-08-15T15:00:00Z', '2026-08-15T15:30:00Z'),
        cp(10, null, '2026-08-15T19:00:00Z'),
        cp(20, '2026-08-15T19:00:00Z', '2026-08-15T23:00:00Z'),
      ],
    };
    // The lead series spans 0–20 straight through the gap.
    const eta = etaAtMile(patchy, 10);
    expect(formatClock(eta!.lead!, TZ)).toBe('10:00am');
    expect(formatClock(eta!.sweep!, TZ)).toBe('12:00pm');
  });

  it('is not exact when half the reading was interpolated', () => {
    // Standing on a checkpoint that states a sweep but no lead: the lead came
    // from its neighbours, so the pair as a whole is a guess.
    const patchy = {
      checkpoints: [
        cp(0, '2026-08-15T15:00:00Z', '2026-08-15T15:30:00Z'),
        cp(10, null, '2026-08-15T19:00:00Z'),
        cp(20, '2026-08-15T19:00:00Z', '2026-08-15T23:00:00Z'),
      ],
    };
    expect(etaAtMile(patchy, 10)!.exact).toBe(false);
    expect(etaAtMile(patchy, 20)!.exact).toBe(true);
  });

  it('still calls an untimed checkpoint a cutoff', () => {
    // The gate is enforced whether or not anyone estimated the clock.
    const patchy = {
      checkpoints: [
        cp(0, '2026-08-15T15:00:00Z', '2026-08-15T15:30:00Z'),
        cp(10, null, null, { isCutoff: true }),
        cp(20, '2026-08-15T19:00:00Z', '2026-08-15T23:00:00Z'),
      ],
    };
    expect(etaAtMile(patchy, 10)!.cutoff).toBe(true);
  });

  it('leaves an untimed checkpoint out of the spread buckets', () => {
    // A spread is the gap between two times; one without the other has none,
    // and would bucket a stretch of course under a blank.
    const patchy = {
      checkpoints: [
        cp(0, '2026-08-15T15:00:00Z', '2026-08-15T15:30:00Z'),
        cp(10, '2026-08-15T17:00:00Z', null),
        cp(20, '2026-08-15T19:00:00Z', '2026-08-15T23:00:00Z'),
      ],
    };
    expect(spreadBuckets(patchy).map((b) => b.checkpoint.mile)).toEqual([
      0, 20,
    ]);
  });

  it('has no buckets at all when nothing is fully timed', () => {
    expect(spreadBuckets({ checkpoints: UNTIMED })).toEqual([]);
  });
});

describe('formatSpread', () => {
  it('names the unit a rider is deciding with', () => {
    expect(formatSpread(0.5)).toBe('under a minute');
    expect(formatSpread(45)).toBe('45min spread');
    expect(formatSpread(132)).toBe('2.2hr spread');
  });

  it('degrades rather than printing NaN', () => {
    expect(formatSpread(Number.NaN)).toBe('under a minute');
  });
});

describe('etaSentence', () => {
  it('hedges an interpolated reading', () => {
    const sentence = etaSentence(etaAtMile(EVENT, 15)!, 15, TZ);
    expect(sentence).toContain('typically pass around');
    expect(sentence).not.toContain('cutoff');
  });

  it('states a cutoff plainly when the organizer gave it times', () => {
    const sentence = etaSentence(etaAtMile(EVENT, 20)!, 20, TZ);
    expect(sentence).toContain('cutoff');
    expect(sentence).not.toContain('typically');
  });

  it('still hedges a cutoff whose times were interpolated', () => {
    // Since the times became optional a cutoff can carry none of its own. The
    // gate is real, but its clock came from the neighbours — and reading
    // "Mile 10 cutoff · 12:00pm" off a guess is the false confidence the plain
    // register exists to avoid.
    const gateOnly = {
      checkpoints: [
        cp(0, '2026-08-15T15:00:00Z', '2026-08-15T15:30:00Z'),
        cp(10, null, null, { isCutoff: true, label: 'Aid 2' }),
        cp(20, '2026-08-15T19:00:00Z', '2026-08-15T23:00:00Z'),
      ],
    };
    const eta = etaAtMile(gateOnly, 10);
    expect(eta!.cutoff).toBe(true);
    expect(eta!.exact).toBe(false);

    const sentence = etaSentence(eta!, 10, TZ);
    // Names the gate — a rider needs to know it is there …
    expect(sentence).toContain('cutoff');
    // … but does not pretend the clock is the organizer's.
    expect(sentence).toContain('typically pass around');
  });

  it('drops the decimal on a whole mile', () => {
    expect(etaSentence(etaAtMile(EVENT, 20)!, 20, TZ)).toContain('Mile 20');
    expect(etaSentence(etaAtMile(EVENT, 12.5)!, 12.5, TZ)).toContain(
      'Mile 12.5',
    );
  });
});

describe('spreadBuckets', () => {
  it('picks the checkpoint nearest the midpoint of each third', () => {
    const cps = [0, 5, 10, 15, 20, 25].map((m) =>
      cp(m, '2026-08-15T15:00:00Z', '2026-08-15T16:00:00Z'),
    );
    // Targets are 4.17, 12.5 and 20.83 of a 0–25 course. 12.5 is an exact tie
    // between 10 and 15, and a tie goes to the later checkpoint.
    expect(
      spreadBuckets({ checkpoints: cps }).map((b) => b.checkpoint.mile),
    ).toEqual([5, 15, 20]);
  });

  it('breaks a tie towards the later checkpoint', () => {
    // On an evenly spaced course every target is a tie, so this is the normal
    // path. Breaking low made the last bucket describe the *start* of the final
    // third — a race whose sweep finishes six hours down reported four.
    const cps = [0, 10, 20, 30].map((m) =>
      cp(m, '2026-08-15T15:00:00Z', `2026-08-15T1${5 + m / 10}:00:00Z`),
    );
    expect(
      spreadBuckets({ checkpoints: cps }).map((b) => b.checkpoint.mile),
    ).toEqual([10, 20, 30]);
  });

  it('moves its picks when the miles move', () => {
    const cps = [0, 1, 2, 3, 40].map((m) =>
      cp(m, '2026-08-15T15:00:00Z', '2026-08-15T16:00:00Z'),
    );
    // Nothing is hardcoded: a course clustered at the start picks differently.
    expect(
      spreadBuckets({ checkpoints: cps }).map((b) => b.checkpoint.mile),
    ).toEqual([3, 40]);
  });

  it('never pairs one checkpoint lead with another checkpoint sweep', () => {
    // The property that makes a course-wide window structurally impossible.
    for (const bucket of spreadBuckets(EVENT)) {
      expect(bucket.lead).toBe(bucket.checkpoint.leadEta);
      expect(bucket.sweep).toBe(bucket.checkpoint.sweepEta);
    }
  });

  it('returns two buckets on a two-checkpoint course, not three', () => {
    const buckets = spreadBuckets({ checkpoints: [COURSE[0], COURSE[3]] });
    expect(buckets).toHaveLength(2);
    expect(buckets.map((b) => b.label)).toEqual(['First third', 'Final third']);
  });

  it('has nothing to say without two checkpoints', () => {
    expect(spreadBuckets({ checkpoints: [] })).toEqual([]);
    expect(spreadBuckets({ checkpoints: [COURSE[0]] })).toEqual([]);
  });
});

describe('racePhase', () => {
  const startsAt = '2026-08-15T15:00:00Z'; // 8am Pacific, a Saturday

  function at(iso: string) {
    return racePhase({ startsAt }, new Date(iso), TZ);
  }

  it('is today all day, before and after the gun', () => {
    expect(at('2026-08-15T08:00:00Z')).toBe('today'); // 1am Pacific
    expect(at('2026-08-16T06:00:00Z')).toBe('today'); // 11pm Pacific
  });

  it('previews up to a week out and no further', () => {
    expect(at('2026-08-14T18:00:00Z')).toBe('upcoming');
    expect(at('2026-08-08T18:00:00Z')).toBe('upcoming'); // exactly 7 days
    expect(at('2026-08-07T18:00:00Z')).toBeNull(); // 8 days
  });

  it('goes quiet once the day is over', () => {
    // Nothing infers an end time from the checkpoints; the day ending is what
    // retires a race the organizer forgot to close.
    expect(at('2026-08-16T08:00:00Z')).toBeNull(); // 1am Pacific, the 16th
  });

  it('returns null for an unreadable date rather than throwing', () => {
    expect(racePhase({ startsAt: 'nonsense' }, new Date(), TZ)).toBeNull();
  });
});

describe('raceTagLabel', () => {
  const startsAt = '2026-08-15T15:00:00Z'; // Saturday

  function at(iso: string) {
    return raceTagLabel({ startsAt }, new Date(iso), TZ);
  }

  it('names the day the way a rider would', () => {
    expect(at('2026-08-15T18:00:00Z')).toBe('Race today');
    expect(at('2026-08-14T18:00:00Z')).toBe('Race tomorrow');
    expect(at('2026-08-12T18:00:00Z')).toBe('Race Sat');
  });

  it('says "next" at exactly a week, where the weekday repeats', () => {
    // A bare "Race Sat" read on a Saturday says today.
    expect(at('2026-08-08T18:00:00Z')).toBe('Race next Sat');
  });

  it('is empty when the race is not showing', () => {
    expect(at('2026-08-07T18:00:00Z')).toBe('');
    expect(at('2026-08-20T18:00:00Z')).toBe('');
  });
});

describe('directionLabel', () => {
  const labels = { originLabel: 'trailhead', terminusLabel: 'summit' };

  it('reads the landmarks in the race direction', () => {
    expect(directionLabel({ ...labels, direction: 'forward' })).toBe(
      'trailhead → summit',
    );
    expect(directionLabel({ ...labels, direction: 'reverse' })).toBe(
      'summit → trailhead',
    );
  });

  it('says nothing when the trail has no landmarks to name', () => {
    // Better than falling back to a compass bearing for someone standing at a
    // trailhead.
    expect(
      directionLabel({
        direction: 'forward',
        originLabel: '',
        terminusLabel: 'summit',
      }),
    ).toBe('');
  });
});
