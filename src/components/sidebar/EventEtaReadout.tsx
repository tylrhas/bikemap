/**
 * When racers are expected at the mile the cursor is on.
 *
 * A thin renderer: the arithmetic is `etaAtMile` and `etaSentence`, tested on
 * their own. What lives here is the **visual difference between a stated time
 * and a guessed one** — a checkpoint's own numbers are upright and semibold, an
 * interpolation between two of them is italic. One flag decides both that and
 * the wording, so the two can never disagree.
 */
import { mapConfig } from '@/config/map.config';
import { etaAtMile, etaSentence, type RaceEvent } from '@/data/race-events';
import { cn } from '@/lib/utils';

export function EventEtaReadout({
  className,
  event,
  mile,
}: {
  className?: string;
  event: RaceEvent;
  mile: number;
}) {
  const eta = etaAtMile(event, mile);
  if (!eta) {
    return null;
  }

  return (
    <span
      className={cn(
        'text-event-deep',
        eta.exact ? 'font-semibold' : 'italic',
        className,
      )}
    >
      {etaSentence(eta, mile, mapConfig.timeZone)}
    </span>
  );
}
