import { cn } from '@/lib/utils';

/** Shared Tailwind class strings for components that appear in multiple files */

/**
 * The phone's panel button, floating over the map.
 *
 * Cream rather than white, and the same 92% as `MapControls`, so the two things
 * sitting on the map read as one set rather than two eras of the design.
 */
export const TOGGLE_BTN_CLASS =
  'bg-cream/[0.92] backdrop-blur-sm rounded-full p-3 shadow-[0_1px_3px_rgb(var(--app-secondary)/0.18)] cursor-pointer flex items-center justify-center border-none transition-colors duration-150 hover:bg-cream active:bg-cream/80';

export const TOGGLE_ICON_CLASS = 'w-5 h-5 text-forest';

/**
 * A pickable row in the trail panel: trails, routes, rides, layer toggles.
 *
 * One function because they are one thing. Four copies of the same tile drifted
 * apart twice already — once over the radius, once over the padding — and each
 * time the fix had to be made in four places and was missed in one.
 *
 * The clay rail marking the selected row is an inset shadow rather than a left
 * border. `box-sizing: border-box` is global, so a 3px border came out of the
 * padding and left a row 11px in on the left against 14px on the right; a
 * shadow takes no space, which also retires the transparent placeholder border
 * that existed only to stop the row shifting when selection landed.
 *
 * `leading-tight` is here for the same reason: at the default 1.5 there is more
 * half-leading above a 15px name than below an 11px stat line, so equal padding
 * did not look equal.
 */
export function rowClass(selected: boolean, extra?: string): string {
  return cn(
    'w-full text-left block px-3.5 py-2.5 rounded-card leading-tight cursor-pointer transition-colors',
    selected
      ? 'shadow-[inset_3px_0_0_0_rgb(var(--app-primary))] bg-clay/[0.22]'
      : 'bg-forest-lift hover:bg-cream/[0.10]',
    extra,
  );
}
