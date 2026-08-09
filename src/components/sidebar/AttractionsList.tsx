import { cn } from '@/lib/utils';
import { SectionHeading } from './SectionHeading';
import { mapFeatures } from '@/data/geo_data';
import { SidebarCard } from './SidebarCard';
import type { AttractionsListProps } from './types';

export function AttractionsList({
  show,
  onCenterLocation,
}: AttractionsListProps) {
  if (mapFeatures.length === 0) {
    return null;
  }

  return (
    <div className={cn('mb-6', !show && 'hidden')}>
      <SectionHeading>Attractions</SectionHeading>
      <div className="flex flex-col gap-2">
        {mapFeatures.map((location) => (
          <SidebarCard
            key={location.name}
            colorTheme="blue"
            icon={location.icon}
            title={location.name}
            description={location.description}
            onClick={() => onCenterLocation(location)}
            showArrow
          />
        ))}
      </div>
    </div>
  );
}
