/**
 * How spread out a race's field is, in three places down the course.
 *
 * **It deliberately shows no time range.** Naming one window for a whole course
 * is the thing this feature exists not to do — on a long race the leaders and
 * the sweep are hours apart, and a rider at mile 80 reading "ends at 2pm" has
 * been told something false. What a card can honestly give is shape: how far
 * apart the field is early, in the middle, and late. The times themselves live
 * on the elevation chart, where the rider has said which mile they mean.
 *
 * Not `SidebarCard`: that is built for navigational cards with an icon circle
 * and an arrow, and a three-row breakdown forced through its `description`
 * would be worse than a purpose-built block. This follows the recovery banner
 * in `MyRides` instead — minus its border, because surfaces here meet on their
 * colour change rather than a line.
 */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlagCheckered } from '@fortawesome/free-solid-svg-icons';
import { mapConfig } from '@/config/map.config';
import {
  directionLabel,
  formatClock,
  formatSpread,
  hasEstimates,
  type RaceEvent,
  spreadBuckets,
} from '@/data/race-events';
import { EventTag } from './EventTag';
import { SectionHeading } from './SectionHeading';

export function EventSpreadSummary({
  event,
  now,
}: {
  event: RaceEvent;
  now?: Date;
}) {
  const buckets = spreadBuckets(event);
  const direction = directionLabel(event);

  return (
    <div className="mb-5 p-3 rounded-card bg-event/[0.14] text-ui">
      <div className="flex items-center gap-2 mb-1">
        <FontAwesomeIcon
          aria-hidden="true"
          className="w-3.5 h-3.5 text-event shrink-0"
          icon={faFlagCheckered}
        />
        {/* The organizer's own name for it, never a generic "Race day". */}
        <span className="font-display text-cream text-body font-semibold truncate">
          {event.name}
        </span>
        <EventTag className="ml-auto" event={event} now={now} />
      </div>

      <div className="text-meta text-cream/55 mb-2">
        {direction && `${direction} · `}
        starts {formatClock(event.startsAt, mapConfig.timeZone)}
      </div>

      {buckets.length > 0 && (
        <>
          <SectionHeading>Field spread</SectionHeading>
          <div className="flex flex-col gap-1">
            {buckets.map((bucket) => (
              <div
                className="flex items-baseline justify-between gap-2 text-meta tabular-nums"
                key={bucket.checkpoint.mile}
              >
                <span className="text-cream/70 truncate">
                  {bucket.label} · {bucket.checkpoint.label}
                </span>
                <span className="text-cream/55 shrink-0">
                  mi {Math.round(bucket.checkpoint.mile)} ·{' '}
                  {formatSpread(bucket.spreadMinutes)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Only point at the chart when the chart has something to say. A course
          with places but no times still earns this card — it names the race and
          the direction — but sending someone hunting for estimates that were
          never entered is worse than staying quiet. */}
      {hasEstimates(event) && (
        <div className="text-meta text-cream/45 mt-2">
          Hover the elevation chart for times at a spot.
        </div>
      )}
    </div>
  );
}
