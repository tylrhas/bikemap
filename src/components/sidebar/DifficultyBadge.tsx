'use client';

/**
 * A trail's grade, as a word.
 *
 * The color comes off the trail — which comes off its rating row — rather than
 * a lookup table keyed by "Beginner | Intermediate | Advanced". The design
 * assumes those three; this app lets a curator add a grade without a deploy, so
 * a table would leave anything new uncolored. Reading the trail's own color
 * means a new grade arrives already dressed.
 *
 * Two variants, per the design: filled in a list, outlined on a light surface.
 */
import { cn } from '@/lib/utils';

export function DifficultyBadge({
  className,
  color,
  outline = false,
  rating,
}: {
  className?: string;
  color: string;
  /** Outlined for the detail dock; filled for a list row. */
  outline?: boolean;
  rating: string;
}) {
  // '' is the app's "nobody has graded this", and a badge saying nothing is
  // worse than no badge.
  if (!rating) {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-block text-[10.5px] font-bold uppercase tracking-[0.05em] px-2 py-[3px] rounded-[4px] whitespace-nowrap capitalize',
        className,
      )}
      style={
        outline
          ? { border: `1px solid ${color}`, color }
          : { background: color, color: '#fff' }
      }
    >
      {rating}
    </span>
  );
}
