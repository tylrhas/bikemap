/**
 * The pill saying a trail has a race on it.
 *
 * Built to the same shape as `ConditionBadge` so the two read as siblings when
 * a row carries both — but gold, and never `warn`'s coral: a race is not
 * something wrong with the trail, and a rider deciding where to ride should be
 * able to tell those apart at a glance.
 *
 * Colour comes from the palette rather than an inline style, which is the one
 * deliberate difference from `ConditionBadge`. That one takes a hex a curator
 * picked; this colour is fixed, so it can be a token.
 */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlagCheckered } from '@fortawesome/free-solid-svg-icons';
import { mapConfig } from '@/config/map.config';
import {
  directionLabel,
  formatClock,
  type RaceEvent,
  raceTagLabel,
} from '@/data/race-events';
import { cn } from '@/lib/utils';

export function EventTag({
  className,
  event,
  now,
  size = 'sm',
  surface = 'dark',
}: {
  className?: string;
  event: RaceEvent | undefined;
  now?: Date;
  size?: 'md' | 'sm';
  /**
   * Which panel it sits on. `event-deep` is unreadable on the forest green and
   * the gold is unreadable on cream, so there is no one pairing that works —
   * the same problem `onDarkSurface` solves for trail colours.
   */
  surface?: 'dark' | 'light';
}) {
  const label = event ? raceTagLabel(event, now, mapConfig.timeZone) : '';
  if (!event || !label) {
    return null;
  }

  const direction = directionLabel(event);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap shrink-0',
        size === 'sm' ? 'text-meta px-1.5 py-px' : 'text-meta px-2 py-0.5',
        surface === 'dark'
          ? 'bg-event/20 text-event'
          : 'bg-event/[0.14] text-event-deep',
        className,
      )}
      title={[
        event.name,
        `starts ${formatClock(event.startsAt, mapConfig.timeZone)}`,
        direction,
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      {/* Only at `md`: a list row has no width to spare, the same call
          `ConditionBadge` makes about the age. */}
      {size === 'md' && (
        <FontAwesomeIcon
          aria-hidden="true"
          className="w-2.5 h-2.5"
          icon={faFlagCheckered}
        />
      )}
      {label}
    </span>
  );
}
