import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ToggleSwitch } from './ToggleSwitch';
import { ROW_RAIL_CLASS } from '@/components/styles';

// Shared "Map Layers" sidebar section used by both the Casual and MTB tabs.
export function MapLayersSection({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5">
      {/* The design's section label: uppercase, small, tracked out. */}
      <h3 className="px-1 pb-1 text-meta font-bold uppercase tracking-[0.08em] text-cream/70">
        Map layers
      </h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

interface ToggleRowProps {
  icon: IconDefinition;
  label: string;
  isActive: boolean;
  onToggle: () => void;
}

// A single labeled toggle row (icon + label + switch) with keyboard support.
export function ToggleRow({ icon, label, isActive, onToggle }: ToggleRowProps) {
  return (
    <div
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        'w-full px-3.5 py-2.5 leading-tight cursor-pointer transition-colors flex items-center gap-3',
        // Same raised tile as a trail row, and the same clay rail, so "this
        // layer is on" and "this trail is selected" read as one idea.
        'rounded-card',
        isActive
          ? cn(ROW_RAIL_CLASS, 'bg-clay/[0.22]')
          : 'bg-forest-lift hover:bg-cream/[0.10]',
      )}
    >
      <FontAwesomeIcon
        icon={icon}
        className={cn(
          'w-4 h-4 shrink-0 transition-colors',
          isActive ? 'text-clay' : 'text-cream/50',
        )}
      />
      <div className="min-w-0 flex-1 text-ui font-medium text-cream truncate">
        {label}
      </div>
      <ToggleSwitch isActive={isActive} />
    </div>
  );
}
