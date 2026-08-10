'use client';

/**
 * Distance and elevation, inline with their icons.
 *
 * Both directions, because most of this map goes down: a shuttle run that only
 * advertised its climbing said nothing about the ride. `elevationFigures` drops
 * whichever is a rounding error beside the other, so a climb still reads as a
 * climb.
 *
 * The design also shows a duration ("1h 15m"). There is no such field on a
 * trail here and no honest way to derive one — pace on singletrack varies more
 * with rider and surface than with distance — so it is left out rather than
 * estimated. A map people plan rides from should not state a time it guessed.
 */
import {
  faArrowTrendDown,
  faArrowTrendUp,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { elevationFigures } from '@/data/trail-elevation';
import { cn } from '@/lib/utils';

export function TrailStats({
  className,
  distance,
  elevationGain,
  elevationLoss,
}: {
  className?: string;
  distance?: number;
  elevationGain?: number;
  elevationLoss?: number;
}) {
  const { climb, descent } = elevationFigures({ elevationGain, elevationLoss });

  if (!distance && climb === null && descent === null) {
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
      {climb !== null ? (
        <span className="flex items-center gap-1">
          <FontAwesomeIcon className="w-3 h-3" icon={faArrowTrendUp} />
          {`${climb.toLocaleString()} ft`}
        </span>
      ) : null}
      {descent !== null ? (
        <span className="flex items-center gap-1">
          <FontAwesomeIcon className="w-3 h-3" icon={faArrowTrendDown} />
          {`${descent.toLocaleString()} ft`}
        </span>
      ) : null}
    </div>
  );
}
