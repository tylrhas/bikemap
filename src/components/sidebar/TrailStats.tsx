'use client';

/**
 * Distance and climb, inline with their icons.
 *
 * The design also shows a duration ("1h 15m"). There is no such field on a
 * trail here and no honest way to derive one — pace on singletrack varies more
 * with rider and surface than with distance — so it is left out rather than
 * estimated. A map people plan rides from should not state a time it guessed.
 */
import {
  faArrowTrendUp,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { cn } from '@/lib/utils';

export function TrailStats({
  className,
  distance,
  elevationGain,
}: {
  className?: string;
  distance?: number;
  elevationGain?: number;
}) {
  if (!distance && !elevationGain) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3.5 text-ui text-ink/60 tabular-nums',
        className,
      )}
    >
      {distance ? (
        <span className="flex items-center gap-1">
          <FontAwesomeIcon className="w-3 h-3" icon={faLocationDot} />
          {distance} mi
        </span>
      ) : null}
      {elevationGain ? (
        <span className="flex items-center gap-1">
          <FontAwesomeIcon className="w-3 h-3" icon={faArrowTrendUp} />
          {`+${elevationGain.toLocaleString()} ft`}
        </span>
      ) : null}
    </div>
  );
}
