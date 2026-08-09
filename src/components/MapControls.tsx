'use client';

/**
 * The map's own controls, replacing Mapbox's stock NavigationControl.
 *
 * The default control is the clearest sign a map app has not been designed —
 * it ships in Mapbox's own visual language, not the product's. These are the
 * design's: 34px, 8px radius, cream at 92% so the map reads through.
 *
 * Zoom is deliberately not here. Every device this runs on pinches, scrolls or
 * double-taps to zoom, and two more buttons would crowd a surface whose whole
 * job is to be looked at.
 */
import {
  faExpand,
  faLayerGroup,
  faLocationCrosshairs,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

function ControlButton({
  active,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: IconDefinition;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'w-[34px] h-[34px] rounded-control grid place-items-center transition-colors shadow-[0_1px_3px_rgb(var(--app-secondary)/0.18)]',
        active
          ? 'bg-clay text-cream'
          : 'bg-cream/[0.92] text-forest hover:bg-cream',
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      <FontAwesomeIcon className="w-[15px] h-[15px]" icon={icon} />
    </button>
  );
}

export function MapControls({
  onFullscreen,
  onLayers,
  onLocate,
  tracking = false,
}: {
  onFullscreen: () => void;
  onLayers: () => void;
  onLocate: () => void;
  tracking?: boolean;
}) {
  return (
    <div className="absolute top-4 right-4 z-map-ui flex flex-col gap-2 pointer-events-auto">
      <ControlButton
        icon={faLayerGroup}
        label="Map layers"
        onClick={onLayers}
      />
      <ControlButton
        active={tracking}
        icon={faLocationCrosshairs}
        label="Show my location"
        onClick={onLocate}
      />
      <ControlButton
        icon={faExpand}
        label="Fullscreen"
        onClick={onFullscreen}
      />
    </div>
  );
}
