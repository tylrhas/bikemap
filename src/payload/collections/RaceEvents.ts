import type { CollectionConfig } from 'payload';
import { activeCityId } from '@/config/map.config';
import type { RaceCheckpoint } from '@/data/race-events';

/**
 * A race running on a trail that stays open.
 *
 * **Deliberately not a condition.** A condition means something is wrong with
 * the trail and has no known end; a race means the trail is fine and there are
 * more people on it for a known stretch of the day. Filing one as the other
 * would render a community event as a hazard warning.
 *
 * **The admin-only access rules are the same lock as `TrailConditions`.**
 * Payload mounts its own REST API at /api/race-events, and these rules are what
 * keep it shut. The public read goes through /api/map/events.
 *
 * No drafts. An event is a small live record, and `finished` is the whole
 * lifecycle — there is no `endsAt`, on purpose: a long course has no single
 * moment when the race is over, and a field storing one would end up on screen
 * telling a rider at mile 80 that the course is clear.
 */

/** GeoJSON positions, loosely: enough to know a paste is a line. */
function isPositionList(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length >= 2 &&
        Number.isFinite(Number(pair[0])) &&
        Number.isFinite(Number(pair[1])) &&
        Math.abs(Number(pair[0])) <= 180 &&
        Math.abs(Number(pair[1])) <= 90,
    )
  );
}

/**
 * Accepts a bare LineString or a Feature wrapping one — organizers paste
 * whatever geojson.io gave them, and rejecting the commoner of the two shapes
 * would read as the field being broken.
 */
export function validateCourseGpx(value: unknown): string | true {
  if (value === null || value === undefined || value === '') {
    return true;
  }
  const geometry =
    (value as { geometry?: unknown })?.geometry ??
    (value as { type?: unknown });
  const type = (geometry as { type?: unknown })?.type;
  const coordinates = (geometry as { coordinates?: unknown })?.coordinates;

  if (type !== 'LineString') {
    return 'Paste a GeoJSON LineString, or a Feature containing one.';
  }
  if (!isPositionList(coordinates)) {
    return 'Needs at least two [longitude, latitude] points, in range.';
  }
  return true;
}

/**
 * Checkpoints must climb the course in order, and so must whichever times they
 * carry.
 *
 * **The times are optional**, so each series is checked against the last row
 * that actually had one rather than against the row immediately above. A naive
 * neighbour comparison passes silently across a gap — `Date.parse(undefined)`
 * is NaN and every comparison with NaN is false — which would let a blank row
 * hide a finish time earlier than its start.
 *
 * Exported so it tests without a database. **Nothing downstream may rely on it
 * having run** — rows can predate it or arrive from a seed, which is why
 * `bracketFor` filters and sorts its own copy.
 */
export function validateCheckpoints(value: unknown): string | true {
  const rows = (value ?? []) as Partial<RaceCheckpoint>[];
  if (rows.length < 2) {
    return 'A course needs at least a start and a finish.';
  }

  const series: { key: 'leadEta' | 'sweepEta'; who: string }[] = [
    { key: 'leadEta', who: 'the leaders' },
    { key: 'sweepEta', who: 'the sweep' },
  ];
  const last: Record<string, number> = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (i > 0 && Number(row.mile) <= Number(rows[i - 1].mile)) {
      return `Checkpoint ${i + 1} is not further along the course than the one above it.`;
    }
    for (const { key, who } of series) {
      const at = Date.parse(String(row[key]));
      if (!Number.isFinite(at)) {
        continue;
      }
      if (last[key] !== undefined && at < last[key]) {
        return `Checkpoint ${i + 1} has ${who} arriving before an earlier checkpoint.`;
      }
      last[key] = at;
    }
  }
  return true;
}

export const RaceEvents: CollectionConfig = {
  slug: 'race-events',
  labels: {
    plural: 'Race events',
    singular: 'Race event',
  },
  defaultSort: '-startsAt',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'trail', 'startsAt', 'direction', 'finished'],
    description:
      'Races on a trail that stays open. The listing and map overlay appear a week out, and both come off when you tick “Finished”.',
    group: 'Events',
    listSearchableFields: ['name'],
  },
  access: {
    // See the note above before changing these.
    create: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: {
            description: 'Shown to riders as written, e.g. “CO Trail Series”.',
            width: '60%',
          },
        },
        {
          name: 'trail',
          type: 'relationship',
          relationTo: 'trails',
          required: true,
          index: true,
          admin: { width: '40%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startsAt',
          type: 'date',
          required: true,
          index: true,
          label: 'Start',
          admin: {
            date: { pickerAppearance: 'dayAndTime' },
            description: 'Gun time, in the trail’s local clock.',
            width: '50%',
          },
        },
        {
          name: 'direction',
          type: 'select',
          required: true,
          defaultValue: 'forward',
          options: [
            { label: 'As the line is drawn', value: 'forward' },
            { label: 'Against the line', value: 'reverse' },
          ],
          admin: {
            description:
              'Which way racers travel along the trail’s stored geometry.',
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'originLabel',
          type: 'text',
          defaultValue: 'trailhead',
          label: 'Start of the line',
          admin: {
            // These describe the geometry, not the race, so `direction` stays a
            // pure reading order and the start/finish markers swap as data.
            description:
              'What is at the first point of the trail, e.g. “trailhead”. Used for “trailhead → summit”.',
            width: '50%',
          },
        },
        {
          name: 'terminusLabel',
          type: 'text',
          label: 'End of the line',
          admin: {
            description:
              'What is at the last point, e.g. “summit”. Leave both blank to say nothing about direction.',
            width: '50%',
          },
        },
      ],
    },
    {
      name: 'checkpoints',
      type: 'array',
      required: true,
      minRows: 2,
      validate: validateCheckpoints,
      labels: { plural: 'Checkpoints', singular: 'Checkpoint' },
      admin: {
        description:
          'At minimum a start and a finish. Every aid station you add makes the times between them more accurate — with only two, the app is drawing a straight line across the whole course.',
        initCollapsed: false,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'mile',
              type: 'number',
              required: true,
              min: 0,
              admin: {
                description: 'From the course start, in the race direction.',
                width: '20%',
              },
            },
            {
              name: 'label',
              type: 'text',
              required: true,
              admin: {
                description: 'e.g. “Aid 2 — Skyliner”.',
                width: '30%',
              },
            },
            {
              name: 'leadEta',
              type: 'date',
              label: 'Leaders',
              admin: {
                date: { pickerAppearance: 'dayAndTime' },
                width: '25%',
              },
            },
            {
              name: 'sweepEta',
              type: 'date',
              label: 'Sweep',
              validate: (
                value: unknown,
                { siblingData }: { siblingData: Partial<RaceCheckpoint> },
              ) => {
                // Both are optional, so this only fires when both are set.
                const lead = Date.parse(String(siblingData?.leadEta));
                const sweep = Date.parse(String(value));
                if (
                  Number.isFinite(lead) &&
                  Number.isFinite(sweep) &&
                  sweep < lead
                ) {
                  return 'The back of the field cannot arrive before the front.';
                }
                return true;
              },
              admin: {
                date: { pickerAppearance: 'dayAndTime' },
                width: '25%',
              },
            },
          ],
        },
        {
          name: 'isCutoff',
          type: 'checkbox',
          defaultValue: false,
          label: 'Hard cutoff',
          admin: {
            description:
              'Riders are pulled here. Times for this point are stated plainly instead of hedged, so only tick it when the time is enforced.',
          },
        },
      ],
    },
    {
      name: 'courseGpx',
      type: 'json',
      label: 'Course line',
      validate: validateCourseGpx,
      admin: {
        description:
          'Only when the course differs from the trail’s own line. A GeoJSON LineString — leave blank to use the trail.',
      },
    },
    {
      name: 'finished',
      type: 'checkbox',
      defaultValue: false,
      label: 'Finished',
      index: true,
      admin: {
        description:
          'Takes the race off the map and out of the trail list. The row stays.',
      },
    },
    {
      name: 'city',
      type: 'select',
      required: true,
      defaultValue: activeCityId,
      options: [
        { label: 'Chattanooga', value: 'chattanooga' },
        { label: 'Bend', value: 'bend' },
      ],
      // Hidden, like the one on Trails and TrailConditions. A deployment serves
      // one region, so this is uniformity with its siblings rather than an axis
      // anything varies on.
      admin: { hidden: true },
    },
  ],
};
