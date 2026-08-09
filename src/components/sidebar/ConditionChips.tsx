'use client';

/**
 * What the selected trail is like, as pills over the map.
 *
 * The design floats these top-left and keeps them out of the dock, so the dock
 * stays identity and elevation while conditions live on the map itself.
 *
 * Every chip is real. The prototype also shows "Last rain" and "Riders today";
 * this app records neither, and inventing them on a screen people ride off
 * would be worse than a shorter row.
 *
 * Desktop only — a phone has the sheet, where conditions already read as a
 * list, and pills over a small map would cover the thing they describe.
 */
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faClock,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { useTrailConditions } from '@/components/TrailConditionsProvider';
import { getMountainBikeTrails } from '@/data/trail-source';
import { slugForTrail } from '@/data/mountain-bike-trails';
import { conditionAgeLabel, isConditionCurrent } from '@/data/trail-conditions';
import { MAP_EVENTS } from '@/events';
import { useIsNarrow } from '@/hooks/useIsNarrow';

function Chip({
  color,
  icon,
  label,
  value,
}: {
  color?: string;
  icon: typeof faClock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-[7px] rounded-full bg-cream/[0.94] px-[11px] py-1.5 text-ui shadow-[0_1px_3px_rgba(2,52,40,0.14)]">
      <FontAwesomeIcon
        className="w-[13px] h-[13px]"
        icon={icon}
        style={color ? { color } : undefined}
      />
      <span className="text-ink/55">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

export function ConditionChips() {
  const { latest } = useTrailConditions();
  const narrow = useIsNarrow();
  const [slug, setSlug] = useState<null | string>(null);

  useEffect(() => {
    const onTrail = (event: Event) => {
      const { trailName } = (event as CustomEvent).detail as {
        trailName: string;
      };
      const trail = getMountainBikeTrails().find(
        (item) => item.trailName === trailName,
      );
      // Only a curated trail has conditions; an OSM way or a ride has none.
      setSlug(trail ? slugForTrail(trail) : null);
    };
    const clear = () => setSlug(null);

    window.addEventListener(MAP_EVENTS.TRAIL_SELECT, onTrail);
    window.addEventListener(MAP_EVENTS.TRAIL_DESELECT, clear);
    window.addEventListener(MAP_EVENTS.ROUTE_SELECT, clear);
    return () => {
      window.removeEventListener(MAP_EVENTS.TRAIL_SELECT, onTrail);
      window.removeEventListener(MAP_EVENTS.TRAIL_DESELECT, clear);
      window.removeEventListener(MAP_EVENTS.ROUTE_SELECT, clear);
    };
  }, []);

  if (narrow || !slug) {
    return null;
  }

  const report = latest[slug];

  return (
    <div className="absolute top-4 left-4 z-map-ui flex flex-wrap gap-2 max-w-[70%] pointer-events-none">
      {report && isConditionCurrent(report) ? (
        <>
          <Chip
            color={report.color}
            icon={report.marksClosed ? faTriangleExclamation : faCircleCheck}
            label="Condition"
            value={report.name}
          />
          <Chip
            icon={faClock}
            label={report.source === 'admin' ? 'Steward' : 'Rider'}
            value={conditionAgeLabel(report.observedAt)}
          />
        </>
      ) : (
        // Says the trail has nothing current rather than showing nothing, which
        // reads the same as the feature being broken.
        <Chip
          icon={faClock}
          label="Conditions"
          value={report ? 'Out of date' : 'Not reported yet'}
        />
      )}
    </div>
  );
}
