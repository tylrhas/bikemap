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
