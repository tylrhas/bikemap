/**
 * Where the mobile sheet rests, and how a drag resolves to one of those rests.
 *
 * Pure, so the arithmetic is testable without a DOM. The component owns the
 * gestures; this owns the decisions.
 */

/**
 * How much of the sheet is hidden below the fold at each stop, as a fraction of
 * its own height.
 *
 * Peek is the resting state on a phone: enough for one summary row, the rest
 * map. Half is browsing. Full is the list.
 */
export const SNAP_FRACTIONS = [0.82, 0.45, 0] as const;

export const PEEK = 0;
export const HALF = 1;
export const FULL = 2;

/** Clamps to a real stop, so a bad index can't leave the sheet off-screen. */
export function clampSnap(index: number): number {
  if (!Number.isFinite(index)) {
    return HALF;
  }
  return Math.max(0, Math.min(SNAP_FRACTIONS.length - 1, Math.round(index)));
}

/**
 * The stop a drag ended nearest to.
 *
 * Nearest rather than "whichever way you were heading": a flick has to travel
 * past the midpoint to change the answer, which makes an accidental nudge
 * return the sheet where it was rather than moving it a stop.
 */
export function nearestSnap(fraction: number): number {
  let best = 0;
  for (let i = 1; i < SNAP_FRACTIONS.length; i++) {
    if (
      Math.abs(SNAP_FRACTIONS[i] - fraction) <
      Math.abs(SNAP_FRACTIONS[best] - fraction)
    ) {
      best = i;
    }
  }
  return best;
}

/**
 * Where a drag has moved the sheet to, as a fraction of its height.
 *
 * Bounded by the stops themselves so it cannot be dragged off the bottom or
 * lifted above its full height — rubber-banding past either would have to be
 * animated back, and there is nothing beyond them to reveal.
 */
export function dragFraction(
  startFraction: number,
  deltaY: number,
  sheetHeight: number,
): number {
  if (!(sheetHeight > 0)) {
    return startFraction;
  }
  const moved = startFraction + deltaY / sheetHeight;
  return Math.max(SNAP_FRACTIONS[FULL], Math.min(SNAP_FRACTIONS[PEEK], moved));
}
