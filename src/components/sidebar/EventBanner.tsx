/**
 * The strip across the trail pane saying a race is on.
 *
 * Name, start time, direction, and a pointer at the chart. **Never a time range
 * for the course** — that is the one thing this feature exists not to say, and
 * it is the one thing someone will eventually want to add here because the
 * banner looks like it has room. It does not have the information: a range
 * needs a mile, and the banner does not know which mile the rider means. The
 * chart does, which is what the last line is for.
 *
 * No bottom border. Surfaces here meet on their colour change, and the tint
 * *is* the change.
 */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlagCheckered } from '@fortawesome/free-solid-svg-icons';
import { mapConfig } from '@/config/map.config';
import {
  directionLabel,
  formatClock,
  hasEstimates,
  type RaceEvent,
} from '@/data/race-events';
import { cn } from '@/lib/utils';
import { EventTag } from './EventTag';

export function EventBanner({
  compact = false,
  event,
  now,
}: {
  /** The floating card is tighter than the desktop dock. */
  compact?: boolean;
  event: RaceEvent | undefined;
  now?: Date;
}) {
  if (!event) {
    return null;
  }

  const direction = directionLabel(event);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 bg-event/[0.14] text-ink',
        compact ? 'px-4 py-1.5 text-meta' : 'px-[22px] py-2 text-ui',
      )}
    >
      <FontAwesomeIcon
        aria-hidden="true"
        className="w-3.5 h-3.5 text-event-deep shrink-0"
        icon={faFlagCheckered}
      />
      <span className="font-semibold text-forest truncate">{event.name}</span>
      <EventTag event={event} now={now} size="md" surface="light" />
      <span className="text-ink/65 tabular-nums whitespace-nowrap">
        Starts {formatClock(event.startsAt, mapConfig.timeZone)}
      </span>
      {direction && (
        <span className="text-ink/65 whitespace-nowrap">{direction}</span>
      )}
      {/* Mirrors the dock's own "Hover to scrub the trail" hint, because this
          is the same gesture doing a second job — but only when times were
          entered, or it points at an empty readout. */}
      {hasEstimates(event) && (
        <span className="ml-auto shrink-0 text-meta text-ink/50">
          Hover the chart for times at a spot
        </span>
      )}
    </div>
  );
}
