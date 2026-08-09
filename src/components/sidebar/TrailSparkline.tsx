'use client';

/**
 * The elevation shape on a trail row — the one thing that tells two four-mile
 * trails apart at a glance.
 *
 * Drawn from the real downsampled profile, never from the climb total: a shape
 * inferred from one number would look like a measurement and be a guess. Renders
 * nothing when a trail has no profile, or is flat.
 */
import { sparkPath } from '@/data/trail-spark';

const WIDTH = 52;
const HEIGHT = 22;

export function TrailSparkline({
  color,
  values,
}: {
  color: string;
  values: number[] | undefined;
}) {
  const path = values ? sparkPath(values, WIDTH, HEIGHT) : null;
  if (!path) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      height={HEIGHT}
      role="presentation"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
    >
      <path d={path.area} fill={color} opacity={0.14} />
      <path
        d={path.line}
        fill="none"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
  );
}
