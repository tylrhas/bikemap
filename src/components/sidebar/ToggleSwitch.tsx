import { cn } from '@/lib/utils';
import type { ToggleSwitchProps } from './types';

/**
 * The panel's switch. Clay when on — the accent marks the one thing that is
 * active — against a cream track at 20% when off, which reads as an empty
 * groove on forest rather than a second filled state.
 *
 * Only used inside the trail panel, so it assumes that dark surface.
 */
export function ToggleSwitch({ isActive }: ToggleSwitchProps) {
  return (
    <div
      className={cn(
        'w-10 h-5 rounded-full relative transition-colors duration-200 shrink-0',
        isActive ? 'bg-clay' : 'bg-cream/20',
      )}
    >
      <div
        className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full transition-[left] duration-200',
          isActive ? 'left-[22px] bg-cream' : 'left-0.5 bg-cream/70',
        )}
      />
    </div>
  );
}
