import { faBicycle } from '@fortawesome/free-solid-svg-icons';
import { BIKE_NETWORK_CLASSES } from '@/data/bike-network';
import { ToggleRow } from './MapLayersSection';
import { SectionHeading } from './SectionHeading';

interface BikeNetworkLayerProps {
  isActive: boolean;
  onToggle: () => void;
}

// Casual-mode overlay: a single toggle for the classified bike network plus a
// color legend for the five comfort classes (OSM-derived, inspired by
// bendbikes.org). Rendered only for cities that ship a network GeoJSON.
export function BikeNetworkLayer({
  isActive,
  onToggle,
}: BikeNetworkLayerProps) {
  return (
    <div className="mb-6">
      <SectionHeading>Bike Network</SectionHeading>
      <div className="flex flex-col gap-2">
        <ToggleRow
          icon={faBicycle}
          label="Show bike network"
          isActive={isActive}
          onToggle={onToggle}
        />
        {isActive && (
          <ul className="flex flex-col gap-1.5 px-2 pb-1">
            {BIKE_NETWORK_CLASSES.map((c) => (
              <li
                key={c.key}
                className="flex items-center gap-2 text-ui text-cream/70"
              >
                <span
                  className="inline-block h-1 w-5 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                {c.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
