'use client';

/**
 * The desktop navigation rail.
 *
 * Replaces the pill toggle that used to sit inside the panel header. Two
 * reasons it moved out: the panel is always open on desktop, so a control for
 * switching what it shows belongs beside it rather than inside it; and it gives
 * the interface a fixed anchor, which is the thing a floating drawer over a
 * full-bleed map never had.
 *
 * It only switches. The panel used to collapse when you pressed the section
 * already showing, which meant the rail's one visible state had a second,
 * invisible meaning — and it is a column of the layout, so hiding it buys back
 * space nothing was covering.
 *
 * Deep teal on purpose. The brand had been living entirely on the splash screen
 * while the app itself was white — this is the one surface big enough to carry
 * it without competing with the trail colors.
 *
 * Desktop only; the phone has the sheet.
 */
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { cn } from '@/lib/utils';

export interface RailItem {
  icon: IconDefinition;
  key: string;
  label: string;
}

export function NavRail({
  active,
  items,
  onSelect,
}: {
  active: string;
  items: RailItem[];
  onSelect: (key: string) => void;
}) {
  return (
    <nav
      aria-label="Sections"
      className="flex-none w-14 h-full bg-forest-sunk flex flex-col items-center gap-1 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]"
    >
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <button
            aria-current={selected ? 'page' : undefined}
            className={cn(
              'group relative w-10 h-10 rounded-control grid place-items-center transition-colors',
              selected
                ? 'bg-app-primary text-app-secondary'
                : 'text-white/60 hover:text-white hover:bg-white/10',
            )}
            key={item.key}
            onClick={() => onSelect(item.key)}
            title={item.label}
            type="button"
          >
            <FontAwesomeIcon className="w-4 h-4" icon={item.icon} />
            <span className="sr-only">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
