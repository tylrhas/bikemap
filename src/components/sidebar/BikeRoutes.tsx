import React from 'react';
import { cn } from '@/lib/utils';
import { bikeRoutes } from '@/data/geo_data';
import type { BikeRoutesProps } from './types';

export function BikeRoutes({ selectedRoute, onRouteSelect }: BikeRoutesProps) {
  if (bikeRoutes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {bikeRoutes.map((route) => (
        <div
          key={route.id}
          onClick={() => onRouteSelect(route.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRouteSelect(route.id);
            }
          }}
          role="button"
          tabIndex={0}
          data-selected={selectedRoute === route.id || undefined}
          className={cn(
            // The same tile a trail row gets, and the same clay rail — a route
            // and a trail are the same kind of thing to pick.
            'px-3.5 py-2.5 rounded-card cursor-pointer transition-colors border-l-[3px]',
            selectedRoute === route.id
              ? 'border-l-clay bg-clay/[0.22]'
              : 'border-l-transparent bg-forest-lift hover:bg-cream/[0.10]',
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-control"
              style={{ backgroundColor: route.color }}
            />
            <span className="text-ui font-medium text-cream truncate">
              {route.name}
            </span>
            <span className="text-meta text-cream/55 ml-auto shrink-0">
              {route.distance} mi
            </span>
          </div>
          <div className="text-meta text-cream/55 mt-1 ml-7">
            {route.description}
          </div>
        </div>
      ))}
    </div>
  );
}
