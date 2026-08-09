import { faBicycle } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';
import { SectionHeading } from './SectionHeading';
import { bikeResources } from '@/data/geo_data';
import { SidebarCard } from './SidebarCard';
import type { BikeResourcesListProps } from './types';

export function BikeResourcesList({
  show,
  onCenterLocation,
}: BikeResourcesListProps) {
  if (bikeResources.length === 0) {
    return null;
  }

  return (
    <div className={cn('mb-6', !show && 'hidden')}>
      <SectionHeading>Bike Resources</SectionHeading>
      <div className="flex flex-col gap-2">
        {bikeResources.map((location) => (
          <SidebarCard
            key={location.name}
            colorTheme="green"
            icon={faBicycle}
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
