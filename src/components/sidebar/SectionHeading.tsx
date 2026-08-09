/**
 * The label above a group in the trail panel.
 *
 * One component because there were six copies of `text-sm text-gray-600`, left
 * over from when the panel was white. On the deep surface they were nearly
 * invisible, and each was free to drift from the others.
 */
import { cn } from '@/lib/utils';

export function SectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        'mb-2 text-meta font-bold uppercase tracking-[0.08em] text-cream/60',
        className,
      )}
    >
      {children}
    </h3>
  );
}
