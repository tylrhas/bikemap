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
 * The clay rail that marks the selected row, as an inset shadow rather than a
 * left border.
 *
 * A border is inside the box — `box-sizing: border-box` is set globally — so a
 * 3px one made the padding 17px on the left against 14px on the right. A shadow
 * takes no space at all, which leaves `px-3.5` meaning what it says and removes
 * the need for a transparent placeholder to stop the row shifting.
 */
export const ROW_RAIL_CLASS =
  'shadow-[inset_3px_0_0_0_rgb(var(--app-primary))]';
