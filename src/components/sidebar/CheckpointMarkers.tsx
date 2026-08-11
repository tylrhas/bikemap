/**
 * The race's checkpoints, marked on the elevation chart.
 *
 * These are the trustworthy points on the course — the organizer stated these
 * times, everything between them is interpolated — so they get weight the hover
 * readout does not: a filled dot and an upright label, against that readout's
 * italic. A hard cutoff goes further still, since it is enforced rather than
 * estimated.
 *
 * Labels sit in a strip **below** the chart rather than floating over the plot.
 * A dozen of them across a hundred units of height is a smear, which is the
 * same reason the map's trail names are placed once at `line-center` instead of
 * repeated along the line.
 */
import type { ElevationProfile as ElevationProfileData } from '@/data/geo_data';
import type { RaceCheckpoint } from '@/data/race-events';
import { cn } from '@/lib/utils';
import { indexAtDistanceFt, profilePointToXY } from './elevation-chart';

const FEET_PER_MILE = 5280;

/** Below this a label overlaps its neighbour. The dot always draws. */
const LABEL_GAP_PX = 44;

interface PlacedCheckpoint {
  checkpoint: RaceCheckpoint;
  showLabel: boolean;
  x: number;
  y: number;
}

/**
 * Checkpoints positioned on the chart, with the crowded labels culled.
 *
 * Exported for its test: the culling is deterministic, so it is worth pinning
 * rather than eyeballing.
 */
export function placeCheckpoints(
  checkpoints: RaceCheckpoint[],
  points: [number, number, number, number][],
  profile: ElevationProfileData,
  chartWidth: number,
): PlacedCheckpoint[] {
  if (points.length === 0 || chartWidth <= 0) {
    return [];
  }
  const courseFt = points[points.length - 1][0];

  const placed: PlacedCheckpoint[] = [];
  let lastLabelX = Number.NEGATIVE_INFINITY;

  for (const checkpoint of checkpoints) {
    const distanceFt = checkpoint.mile * FEET_PER_MILE;
    // An organizer's course can run past the end of the curated trail; a
    // marker pinned to the last pixel would claim it did not.
    if (distanceFt > courseFt) {
      continue;
    }
    const index = indexAtDistanceFt(points, distanceFt);
    if (index === null) {
      continue;
    }
    const { x, y } = profilePointToXY(points, index, profile, chartWidth);
    const showLabel = x - lastLabelX >= LABEL_GAP_PX;
    if (showLabel) {
      lastLabelX = x;
    }
    placed.push({ checkpoint, showLabel, x, y });
  }

  return placed;
}

export function CheckpointMarkers({
  chartWidth,
  checkpoints,
  points,
  profile,
}: {
  chartWidth: number;
  checkpoints: RaceCheckpoint[];
  points: [number, number, number, number][];
  profile: ElevationProfileData;
}) {
  const placed = placeCheckpoints(checkpoints, points, profile, chartWidth);
  if (placed.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      data-testid="checkpoint-markers"
    >
      {placed.map(({ checkpoint, showLabel, x, y }) => (
        <div key={`${checkpoint.mile}-${checkpoint.label}`}>
          <div
            className={cn(
              // Round for a reason, like the location dot.
              'absolute w-[7px] h-[7px] rounded-full bg-event-deep border-2 border-cream -translate-x-1/2 -translate-y-1/2',
              checkpoint.isCutoff && 'ring-2 ring-event/40',
            )}
            style={{
              // Only x maps one to one: the viewBox is 100 units tall but the
              // chart renders at a viewport-relative height, so y is a share.
              left: `${(x / chartWidth) * 100}%`,
              top: `${y}%`,
            }}
          />
          {showLabel && (
            <span
              className={cn(
                'absolute -translate-x-1/2 top-full text-micro whitespace-nowrap tabular-nums',
                checkpoint.isCutoff
                  ? 'font-bold text-event-deep'
                  : 'font-semibold text-event-deep/80',
              )}
              style={{ left: `${(x / chartWidth) * 100}%` }}
            >
              {checkpoint.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
