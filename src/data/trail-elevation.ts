/**
 * Which elevation figures a trail is worth describing by.
 *
 * Everything used to show climbing and only climbing, which is wrong for more
 * of this map than it is right: 112 of Bend's 184 measured trails lose more
 * than they climb, and 37 climb nothing at all. "50 Shades of Blue" drops 116
 * feet in a quarter mile and rendered no elevation whatsoever, because zero is
 * falsy. Larison Rock drops 2,111 feet and advertised "+11 ft".
 *
 * So: a trail is described by whichever directions it actually goes. A figure
 * is dropped when it is a rounding error beside the other one — every real
 * trail has a few feet of counter-grade, and printing "+11 ft" next to a
 * 2,000-foot descent says something false about the ride.
 */

/**
 * How small a figure can be, against the larger one, before it stops being part
 * of the ride and starts being noise. A fifth is enough to be worth a rider's
 * attention on a shuttle run.
 */
export const MINOR_SHARE = 0.2;

export interface ElevationFigures {
  /** Feet of climbing worth showing, or null. */
  climb: null | number;
  /** Feet of descending worth showing, or null. */
  descent: null | number;
}

export interface Elevations {
  elevationGain?: number;
  elevationLoss?: number;
}

/** Both directions, minus whichever is noise. Used where there is room. */
export function elevationFigures({
  elevationGain,
  elevationLoss,
}: Elevations): ElevationFigures {
  const gain = Math.round(elevationGain ?? 0);
  const loss = Math.round(elevationLoss ?? 0);
  const larger = Math.max(gain, loss);

  if (larger <= 0) {
    return { climb: null, descent: null };
  }

  const worthShowing = (value: number) =>
    value > 0 && value >= larger * MINOR_SHARE ? value : null;

  return { climb: worthShowing(gain), descent: worthShowing(loss) };
}

export interface DominantElevation {
  direction: 'down' | 'up';
  feet: number;
}

/**
 * The single figure a list row gets.
 *
 * A row is for scanning, so it takes the direction the trail mostly goes; the
 * detail pane, where you are deciding rather than skimming, shows both.
 */
export function dominantElevation(
  elevations: Elevations,
): DominantElevation | null {
  const gain = Math.round(elevations.elevationGain ?? 0);
  const loss = Math.round(elevations.elevationLoss ?? 0);

  if (gain <= 0 && loss <= 0) {
    return null;
  }
  // Ties go to climbing: a loop measures about even, and what a rider wants to
  // know about a loop is what it costs them.
  return loss > gain
    ? { direction: 'down', feet: loss }
    : { direction: 'up', feet: gain };
}

/** `1234` -> `+1,234 ft` / `−1,234 ft`, with a real minus sign. */
export function formatElevationChange(
  feet: number,
  direction: 'down' | 'up',
): string {
  return `${direction === 'down' ? '−' : '+'}${feet.toLocaleString()} ft`;
}
