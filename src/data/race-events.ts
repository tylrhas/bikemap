/**
 * A race running on a trail that stays open, and the arithmetic that turns its
 * checkpoints into a time for one spot on the course.
 *
 * Shared by the server read path and the client, so nothing here may import
 * Node — same contract as `trail-conditions.ts`. Types and arithmetic only: the
 * Tailwind content globs don't cover `src/data`, so a class string written here
 * would be purged.
 *
 * **The rule the whole feature exists to keep: no surface ever states one time
 * window for a whole course.** On a long race the lead pack and the sweep are
 * hours apart at any given point, so "the race ends at 2pm" read at mile 80 is
 * false confidence. Every time comes from `etaAtMile`, and every summary figure
 * from `spreadBuckets` — which is built so that emitting a course-wide range is
 * not something it can do (see the note on that function).
 *
 * **Times interpolate in epoch milliseconds, not minutes past midnight.** A
 * race with a 22:30 lead and a 01:15 sweep wraps under the latter and produces
 * nonsense. Epoch ms is identical inside a day, monotonic across one, and needs
 * no DST special case. A clock appears in exactly one place: `formatClock`.
 */

/** How far ahead a race is worth previewing. Beyond this it is not news yet. */
export const RACE_PREVIEW_DAYS = 7;

/** How often an open map checks for organizer changes. */
export const RACE_REFRESH_SECONDS = 60;

/**
 * How close to a checkpoint counts as being *at* it, in miles (~264 ft). A
 * hover pixel covers more ground than this on any real course, so without a
 * tolerance the checkpoint's own stated time would be almost unreachable.
 */
export const CHECKPOINT_EPSILON_MILES = 0.05;

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/**
 * A point on the course.
 *
 * **The two times are optional, and independently so.** A checkpoint is first
 * a *place* — an organizer routinely knows where the aid stations are months
 * before anyone has estimated when the field reaches them, and often knows when
 * the leaders come through without knowing when the sweep will. An untimed
 * checkpoint still earns its dot on the chart; it just contributes nothing to
 * the estimates.
 */
export interface RaceCheckpoint {
  /** Organizer-enforced: riders are pulled here. Changes the wording. */
  isCutoff: boolean;
  label: string;
  /** ISO 8601, or null when nobody has estimated the front of the field. */
  leadEta: null | string;
  /** Distance from the course start, along the course, in the race direction. */
  mile: number;
  /** ISO 8601, or null when nobody has estimated the back of the field. */
  sweepEta: null | string;
}

/** The two independently interpolated time series a checkpoint can carry. */
type TimeKey = 'leadEta' | 'sweepEta';

export interface RaceEvent {
  checkpoints: RaceCheckpoint[];
  /**
   * The course as drawn, `[lng, lat]`. Resolved server-side from the event's
   * own GPX or the trail's geometry; `[]` when neither exists, in which case
   * the map draws nothing and every other surface still works.
   */
  course: [number, number][];
  direction: 'forward' | 'reverse';
  id: string;
  name: string;
  /** What is at the *first* coordinate of the course, e.g. "trailhead". */
  originLabel: string;
  /** ISO 8601. */
  startsAt: string;
  /** What is at the *last* coordinate, e.g. "summit". */
  terminusLabel: string;
  /**
   * The key everything joins on. The spec models this as a row id, but every
   * client join in this app is by slug — conditions, elevation, the pane — and
   * a second key space would be one more thing to keep in step.
   */
  trailSlug: string;
}

export interface CheckpointBracket {
  /** 0 at `from`, 1 at `to`. Clamped, so it never extrapolates past an end. */
  fraction: number;
  from: RaceCheckpoint;
  to: RaceCheckpoint;
}

export interface RaceEta {
  /** The pinning checkpoint is a hard cutoff. Drives the *wording*. */
  cutoff: boolean;
  /**
   * Every figure shown came straight off a checkpoint rather than from an
   * interpolation. Drives the *styling*. A reading half stated and half guessed
   * is not exact — the weaker half sets the tone.
   */
  exact: boolean;
  /** ISO 8601, or null when the course carries no lead times. */
  lead: null | string;
  /** Null unless both ends are known — a spread needs two numbers. */
  spreadMinutes: null | number;
  /** ISO 8601, or null when the course carries no sweep times. */
  sweep: null | string;
}

export interface SpreadBucket {
  checkpoint: RaceCheckpoint;
  /** "First third" | "Middle third" | "Final third" */
  label: string;
  lead: string;
  spreadMinutes: number;
  sweep: string;
}

/** Checkpoints that are at least a place on the course, sorted. */
function placed(checkpoints: RaceCheckpoint[]): RaceCheckpoint[] {
  return checkpoints
    .filter((cp) => Number.isFinite(cp.mile))
    .sort((a, b) => a.mile - b.mile);
}

function timeOf(cp: RaceCheckpoint, key: TimeKey): number {
  return Date.parse(cp[key] ?? '');
}

/**
 * Sorted checkpoints carrying one of the two times.
 *
 * The collection validates what it can on save, but rows can predate a
 * validator or arrive from a seed, so a blank and an unparseable date are
 * treated the same: absent.
 */
function withTime(
  checkpoints: RaceCheckpoint[],
  key: TimeKey,
): RaceCheckpoint[] {
  return placed(checkpoints).filter((cp) => Number.isFinite(timeOf(cp, key)));
}

/**
 * The two checkpoints a mile sits between, among those carrying a given time.
 *
 * **Clamps, never extrapolates.** Before the first it returns the first pair at
 * fraction 0; past the last, the final pair at 1. Running the line backwards
 * would invent a time before the race started.
 *
 * **Null below two checkpoints**, which is the rule that keeps a half-filled
 * calendar honest: with a single timed point, interpolation would report that
 * one time at every mile of the course — telling a rider at mile 40 that the
 * leaders come through at the start time. Better to say nothing.
 */
export function bracketFor(
  checkpoints: RaceCheckpoint[],
  mile: number,
  key: TimeKey = 'leadEta',
): CheckpointBracket | null {
  const cps = withTime(checkpoints, key);
  if (cps.length < 2) {
    return null;
  }

  if (!Number.isFinite(mile) || mile <= cps[0].mile) {
    return { fraction: 0, from: cps[0], to: cps[1] };
  }
  const last = cps.length - 1;
  if (mile >= cps[last].mile) {
    return { fraction: 1, from: cps[last - 1], to: cps[last] };
  }

  for (let i = 0; i < last; i++) {
    const from = cps[i];
    const to = cps[i + 1];
    if (mile <= to.mile) {
      const span = to.mile - from.mile;
      return { fraction: span > 0 ? (mile - from.mile) / span : 0, from, to };
    }
  }
  return { fraction: 1, from: cps[last - 1], to: cps[last] };
}

interface Estimate {
  /** Taken straight off a checkpoint rather than interpolated. */
  exact: boolean;
  iso: string;
}

/**
 * One series' reading at a mile.
 *
 * The two series are resolved independently, so a missing sweep in the middle
 * of the course leaves a hole in the sweep line only — the lead estimates
 * either side of it are unaffected.
 */
function estimate(
  checkpoints: RaceCheckpoint[],
  key: TimeKey,
  mile: number,
): Estimate | null {
  const bracket = bracketFor(checkpoints, mile, key);
  if (!bracket) {
    return null;
  }
  const { fraction, from, to } = bracket;

  const nearer =
    Math.abs(mile - from.mile) <= Math.abs(mile - to.mile) ? from : to;
  if (Math.abs(mile - nearer.mile) <= CHECKPOINT_EPSILON_MILES) {
    return { exact: true, iso: nearer[key] as string };
  }

  const a = timeOf(from, key);
  const b = timeOf(to, key);
  return {
    exact: false,
    iso: new Date(a + (b - a) * fraction).toISOString(),
  };
}

/**
 * The checkpoint a mile is standing on, if any — regardless of whether it
 * carries times. What makes a cutoff read as a cutoff even when its own
 * estimates came from its neighbours.
 */
function pinnedAt(
  checkpoints: RaceCheckpoint[],
  mile: number,
): RaceCheckpoint | null {
  let nearest: RaceCheckpoint | null = null;
  for (const cp of placed(checkpoints)) {
    if (!nearest || Math.abs(cp.mile - mile) < Math.abs(nearest.mile - mile)) {
      nearest = cp;
    }
  }
  return nearest && Math.abs(nearest.mile - mile) <= CHECKPOINT_EPSILON_MILES
    ? nearest
    : null;
}

/**
 * When the field is expected at a point on the course.
 *
 * Within `CHECKPOINT_EPSILON_MILES` of a checkpoint the reading is that
 * checkpoint's own stated time, flagged `exact` — the organizer's number beats
 * anything interpolated near it.
 *
 * `exact` is proximity to a checkpoint's mile, **not** a fraction of 0 or 1:
 * clamping produces those for any mile off either end of the course, where
 * there is nothing exact about the answer. A reading that is exact in one
 * series and interpolated in the other is not exact — the guess sets the tone.
 *
 * Returns null only when neither series can say anything at all.
 */
export function etaAtMile(
  event: Pick<RaceEvent, 'checkpoints'>,
  mile: number,
): RaceEta | null {
  const lead = estimate(event.checkpoints, 'leadEta', mile);
  const sweep = estimate(event.checkpoints, 'sweepEta', mile);
  if (!lead && !sweep) {
    return null;
  }

  const pinned = pinnedAt(event.checkpoints, mile);
  const spreadMinutes =
    lead && sweep
      ? Math.max(
          0,
          (Date.parse(sweep.iso) - Date.parse(lead.iso)) / MS_PER_MINUTE,
        )
      : null;

  return {
    cutoff: pinned?.isCutoff === true,
    // Every figure being shown has to be stated, not just one of them.
    exact: (lead?.exact ?? true) && (sweep?.exact ?? true),
    lead: lead?.iso ?? null,
    spreadMinutes,
    sweep: sweep?.iso ?? null,
  };
}

/**
 * Whether the course can say anything about timing at all.
 *
 * Two checkpoints have to carry the same series before it can be interpolated,
 * so a calendar with places but no times has nothing to offer the hover — and
 * the surfaces that point at it should not.
 */
export function hasEstimates(event: Pick<RaceEvent, 'checkpoints'>): boolean {
  return (
    withTime(event.checkpoints, 'leadEta').length >= 2 ||
    withTime(event.checkpoints, 'sweepEta').length >= 2
  );
}

/** `132` -> `2.2hr spread`. The unit a rider is deciding with. */
export function formatSpread(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 1) {
    return 'under a minute';
  }
  if (minutes < 90) {
    return `${Math.round(minutes)}min spread`;
  }
  return `${(minutes / 60).toFixed(1)}hr spread`;
}

/**
 * `12:50pm`, in the trail's zone rather than the reader's.
 *
 * Pass `timeZone` from `mapConfig` at every call site — the default is whatever
 * the device is set to, which is right only by coincidence.
 */
export function formatClock(iso: string, timeZone?: string): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) {
    return '';
  }
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
    timeZone,
  })
    .format(at)
    .replace(/\s/g, '')
    .toLowerCase();
}

/** `40` -> `40`, `12.5` -> `12.5`. No trailing `.0` on a whole mile. */
function formatMile(mile: number): string {
  return Number.isInteger(mile) ? String(mile) : mile.toFixed(1);
}

/**
 * The one sentence shown for a point on the course.
 *
 * Two registers for the *times*, and only two. A time the organizer wrote down
 * is stated plainly; a time interpolated between two of theirs is hedged.
 *
 * **Being a cutoff is not on its own enough to state a time plainly.** Since
 * the times became optional, a cutoff can carry none of its own — the gate is
 * real but its clock came from the checkpoints either side, and reading
 * "Mile 40 cutoff · 12:50pm" off a guess is precisely the false confidence the
 * plain register exists to avoid. So the label and the hedge are independent:
 * the sentence always names the cutoff, and hedges unless `exact`.
 *
 * With only one of the two series it says only what is known. "Leaders through
 * around 12:50pm" is useful on its own; padding it into a range would invent
 * the half nobody estimated.
 */
export function etaSentence(
  eta: RaceEta,
  mile: number,
  timeZone?: string,
): string {
  const at = `Mile ${formatMile(mile)}${eta.cutoff ? ' cutoff' : ''}`;
  const lead = eta.lead ? formatClock(eta.lead, timeZone) : '';
  const sweep = eta.sweep ? formatClock(eta.sweep, timeZone) : '';
  const stated = eta.exact;

  if (lead && sweep) {
    const spread =
      eta.spreadMinutes === null ? '' : ` · ${formatSpread(eta.spreadMinutes)}`;
    return stated
      ? `${at} · ${lead}–${sweep}${spread}`
      : `${at} · racers typically pass around ${lead}–${sweep}${spread}`;
  }

  if (lead) {
    return stated
      ? `${at} · leaders ${lead}`
      : `${at} · leaders through around ${lead}`;
  }
  return stated
    ? `${at} · sweep ${sweep}`
    : `${at} · sweep through around ${sweep}`;
}

/**
 * Named by position in the finished list rather than by where the checkpoint
 * sits, so a course that yields fewer than three still reads correctly — two
 * buckets are a first and a last, not a first and a middle.
 */
const BUCKET_LABELS: Record<number, string[]> = {
  1: ['Course'],
  2: ['First third', 'Final third'],
  3: ['First third', 'Middle third', 'Final third'],
};

/**
 * How spread out the field is at three points down the course, computed from
 * the checkpoints rather than written down anywhere.
 *
 * Targets are the **midpoint** of each third, not its boundary: a midpoint
 * describes the stretch it sits in, while a boundary belongs to two of them and
 * reads as a hand-off. Each target then takes the nearest real checkpoint,
 * because a checkpoint's own numbers beat an interpolation near it.
 *
 * **Ties go to the later checkpoint**, and on an evenly spaced course a tie is
 * the normal case rather than an edge one — the midpoints land exactly between
 * checkpoints. Breaking them low made the last bucket report the *start* of the
 * final third, so a 30-mile race whose sweep finishes six hours down claimed
 * four; the later checkpoint bounds what a rider in that stretch will actually
 * meet, which is the number the card is for.
 *
 * **Every bucket's times come from one checkpoint**, so `bucket.lead` is always
 * that checkpoint's `leadEta`. That is what makes it structurally impossible
 * for this function to pair the first checkpoint's lead with the last one's
 * sweep — i.e. to emit the course-wide window the feature must never show. Keep
 * that property if you change this.
 *
 * Only checkpoints carrying **both** times are candidates: a spread is the gap
 * between the two, so one without the other has no spread to report and would
 * bucket a stretch of the course under a blank.
 */
export function spreadBuckets(
  event: Pick<RaceEvent, 'checkpoints'>,
): SpreadBucket[] {
  const cps = placed(event.checkpoints).filter(
    (cp) =>
      Number.isFinite(timeOf(cp, 'leadEta')) &&
      Number.isFinite(timeOf(cp, 'sweepEta')),
  );
  if (cps.length < 2) {
    return [];
  }

  const first = cps[0].mile;
  const span = cps[cps.length - 1].mile - first;

  const picked: RaceCheckpoint[] = [];
  for (const share of [1 / 6, 3 / 6, 5 / 6]) {
    const target = first + span * share;
    let best = cps[0];
    for (const cp of cps) {
      // `<=` keeps ties on the later mile, since `cps` is sorted ascending.
      if (Math.abs(cp.mile - target) <= Math.abs(best.mile - target)) {
        best = cp;
      }
    }
    if (!picked.includes(best)) {
      picked.push(best);
    }
  }

  const labels = BUCKET_LABELS[picked.length] ?? [];

  return picked.map((checkpoint, index) => ({
    checkpoint,
    label: labels[index] ?? '',
    // Non-null: the filter above kept only checkpoints carrying both.
    lead: checkpoint.leadEta as string,
    spreadMinutes: Math.max(
      0,
      (timeOf(checkpoint, 'sweepEta') - timeOf(checkpoint, 'leadEta')) /
        MS_PER_MINUTE,
    ),
    sweep: checkpoint.sweepEta as string,
  }));
}

/**
 * `2026-08-10` for an instant, in a given zone.
 *
 * Phase is a question about calendar days, not elapsed milliseconds — "starts
 * tomorrow" is true at 11pm the night before and at 1am the same night. Keys
 * compare correctly as strings and cost no date library, and going through
 * `Intl` makes DST somebody else's problem.
 */
function dayKey(at: Date | number, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Whole calendar days from one day key to another. Negative if `to` is past. */
function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      MS_PER_DAY,
  );
}

function daysUntilStart(
  event: Pick<RaceEvent, 'startsAt'>,
  now: Date,
  timeZone?: string,
): number | null {
  const start = Date.parse(event.startsAt);
  if (!Number.isFinite(start)) {
    return null;
  }
  return daysBetween(dayKey(now, timeZone), dayKey(start, timeZone));
}

/**
 * Whether a race is worth showing, and how loudly.
 *
 * `today` lasts the whole calendar day whether or not the gun has fired — the
 * spec gives a race no end time, and guessing one is how a rider gets told the
 * course is clear while a straggler is still on it. A race is retired by an
 * organizer ticking `finished`, or by the day ending; nothing infers it from
 * the checkpoints.
 */
export function racePhase(
  event: Pick<RaceEvent, 'startsAt'>,
  now: Date = new Date(),
  timeZone?: string,
): 'today' | 'upcoming' | null {
  const days = daysUntilStart(event, now, timeZone);
  if (days === null || days < 0) {
    return null;
  }
  if (days === 0) {
    return 'today';
  }
  return days <= RACE_PREVIEW_DAYS ? 'upcoming' : null;
}

/** "Race today" / "Race tomorrow" / "Race Sat". `''` when it isn't showing. */
export function raceTagLabel(
  event: Pick<RaceEvent, 'startsAt'>,
  now: Date = new Date(),
  timeZone?: string,
): string {
  const days = daysUntilStart(event, now, timeZone);
  if (days === null || days < 0 || days > RACE_PREVIEW_DAYS) {
    return '';
  }
  if (days === 0) {
    return 'Race today';
  }
  if (days === 1) {
    return 'Race tomorrow';
  }
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(Date.parse(event.startsAt));
  // A week out lands on today's weekday, and a bare "Race Sat" on a Saturday
  // reads as today.
  return days === RACE_PREVIEW_DAYS
    ? `Race next ${weekday}`
    : `Race ${weekday}`;
}

/**
 * "trailhead → summit", read in the race's direction.
 *
 * The labels describe the geometry, not the race, so direction is only a
 * reading order — which is also what makes the start/finish marker swap on the
 * map plain data rather than a paint expression. Empty when the trail has no
 * landmarks to name; the spec would rather say nothing than give a compass
 * bearing to somebody standing at a trailhead.
 */
export function directionLabel(
  event: Pick<RaceEvent, 'direction' | 'originLabel' | 'terminusLabel'>,
): string {
  const origin = event.originLabel?.trim();
  const terminus = event.terminusLabel?.trim();
  if (!origin || !terminus) {
    return '';
  }
  return event.direction === 'reverse'
    ? `${terminus} → ${origin}`
    : `${origin} → ${terminus}`;
}
