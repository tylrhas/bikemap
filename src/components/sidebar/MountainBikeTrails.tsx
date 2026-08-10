import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronRight,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';
import {
  dominantElevation,
  formatElevationChange,
} from '@/data/trail-elevation';
import { regionOf } from '@/data/trail-region';
import { getMountainBikeTrails } from '@/data/trail-source';
import { useTrailConditions } from '@/components/TrailConditionsProvider';
import { ConditionBadge } from './ConditionBadge';
import { TrailSparkline } from './TrailSparkline';
import type { MountainBikeTrailsProps } from './types';
import type { MountainBikeTrail } from '@/data/mountain-bike-trails';
import { slugForTrail } from '@/data/mountain-bike-trails';

/**
 * Groups the current trail list region -> area -> trails, with a trail count
 * per region.
 *
 * Called during render rather than at module scope: trails arrive from the
 * database via `setMountainBikeTrails` while this component's module is being
 * imported, so anything computed at import time captures the checked-in
 * fallback data and never sees a database row.
 */
function groupTrailsByRegionAndArea() {
  const grouped = new Map<string, Map<string, MountainBikeTrail[]>>();
  for (const trail of getMountainBikeTrails()) {
    const region = regionOf(trail);
    const { recArea } = trail;
    if (!grouped.has(region)) {
      grouped.set(region, new Map());
    }
    const areas = grouped.get(region);
    if (!areas) continue;
    if (!areas.has(recArea)) {
      areas.set(recArea, []);
    }
    areas.get(recArea)?.push(trail);
  }

  const counts = new Map<string, number>();
  for (const [region, areas] of grouped) {
    let count = 0;
    for (const trails of areas.values()) count += trails.length;
    counts.set(region, count);
  }

  return { counts, grouped };
}

function toggleSet(
  setter: React.Dispatch<React.SetStateAction<Set<string>>>,
  item: string,
) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(item)) {
      next.delete(item);
    } else {
      next.add(item);
    }
    return next;
  });
}

/*
 * The rating swatch is gone: the row names the difficulty in words now, the
 * way the design does. That is also less color-dependent than the shape and
 * color pair it replaces — the sparkline still carries the rating's color.
 */
function TrailRow({
  trail,
  selectedTrail,
  onTrailSelect,
}: {
  trail: MountainBikeTrail;
  selectedTrail: string | null;
  onTrailSelect: (name: string) => void;
}) {
  // Keyed by slug, not name: two complexes can both have a "Larry".
  const { latest } = useTrailConditions();
  const condition = latest[slugForTrail(trail)];

  const active = selectedTrail === trail.trailName;
  // One figure here, whichever way the trail mostly goes: a row is for
  // scanning. The dock shows both, where you are deciding rather than skimming.
  const elevation = dominantElevation(trail);

  return (
    <button
      type="button"
      onClick={() => onTrailSelect(trail.trailName)}
      data-selected={active || undefined}
      data-faded={(selectedTrail && !active) || undefined}
      className={cn(
        // The clay left rail is how the design marks the active trail; every
        // row carries a transparent one so nothing shifts when it lands.
        'w-full text-left block border-l-[3px] px-4 py-3 transition-colors',
        active
          ? 'border-l-clay bg-clay/[0.18]'
          : 'border-l-transparent hover:bg-cream/[0.07]',
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-display text-cream text-body font-semibold truncate">
          {trail.displayName}
        </span>
        <ConditionBadge report={condition} />
      </div>
      <div className="flex items-center gap-2.5 text-cream/55 text-meta tabular-nums">
        {trail.distance ? <span>{trail.distance} mi</span> : null}
        {elevation ? (
          <span>
            {formatElevationChange(elevation.feet, elevation.direction)}
          </span>
        ) : null}
        {trail.rating ? (
          <span className="capitalize">{trail.rating}</span>
        ) : null}
        <TrailSparkline color={trail.color} values={trail.spark} />
      </div>
    </button>
  );
}

export function MountainBikeTrails({
  selectedTrail,
  onTrailSelect,
  onAreaSelect,
}: MountainBikeTrailsProps) {
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(
    new Set(),
  );
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // The trail list is fixed for the life of the page, so this runs once —
  // but it has to run during render, not at import. See the note above.
  const { counts: regionTrailCounts, grouped: regionGroups } = useMemo(
    () => groupTrailsByRegionAndArea(),
    [],
  );

  // Filter trails by search query (matches trail name, area, or region)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return getMountainBikeTrails().filter((trail) => {
      const region = regionOf(trail);
      return (
        trail.trailName.toLowerCase().includes(q) ||
        trail.displayName.toLowerCase().includes(q) ||
        trail.recArea.toLowerCase().includes(q) ||
        region.toLowerCase().includes(q)
      );
    });
  }, [searchQuery]);

  // Auto-expand region and area when a trail is selected
  useEffect(() => {
    if (!selectedTrail) return;
    const trail = getMountainBikeTrails().find(
      (t) => t.trailName === selectedTrail,
    );
    if (!trail) return;
    const region = regionOf(trail);
    setExpandedRegions((prev) => {
      if (prev.has(region)) return prev;
      return new Set(prev).add(region);
    });
    setExpandedAreas((prev) => {
      if (prev.has(trail.recArea)) return prev;
      return new Set(prev).add(trail.recArea);
    });
  }, [selectedTrail]);

  function handleAreaClick(area: string) {
    toggleSet(setExpandedAreas, area);
    onAreaSelect(area);
  }

  return (
    <div className="mb-6">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            className="w-full py-2 pr-8 pl-3 rounded-control bg-cream/[0.08] text-ui text-cream border-none outline-none placeholder:text-cream/45"
            placeholder="Search trails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-transparent border-none text-lg text-cream/60 cursor-pointer px-2 py-1 leading-none hover:text-cream"
              onClick={() => {
                setSearchQuery('');
                searchRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>

        {searchResults ? (
          searchResults.length > 0 ? (
            searchResults.map((trail) => (
              <TrailRow
                key={trail.trailName}
                trail={trail}
                selectedTrail={selectedTrail}
                onTrailSelect={onTrailSelect}
              />
            ))
          ) : (
            <div className="p-6 text-center text-cream/45 text-ui">
              No trails match &ldquo;{searchQuery}&rdquo;. Try a shorter search.
            </div>
          )
        ) : (
          [...regionGroups.entries()].map(([region, areas]) => {
            const isRegionExpanded = expandedRegions.has(region);
            const regionTrailCount = regionTrailCounts.get(region) ?? 0;
            return (
              <React.Fragment key={region}>
                <div
                  className="text-meta font-bold uppercase tracking-[0.08em] text-cream/70 cursor-pointer rounded pt-3 pb-1.5 px-4 flex items-center whitespace-nowrap hover:text-cream"
                  onClick={() => {
                    toggleSet(setExpandedRegions, region);
                    onAreaSelect(region);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSet(setExpandedRegions, region);
                      onAreaSelect(region);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isRegionExpanded}
                >
                  <span className="text-micro mr-1.5 inline-block w-3 shrink-0">
                    <FontAwesomeIcon
                      icon={isRegionExpanded ? faChevronDown : faChevronRight}
                      className="text-meta"
                    />
                  </span>
                  {region}
                  <span className="ml-auto text-meta font-normal text-cream/40">
                    {regionTrailCount}
                  </span>
                </div>
                {isRegionExpanded &&
                  [...areas.entries()].map(([area, trails]) => {
                    const singleArea = areas.size === 1;
                    const isAreaExpanded =
                      singleArea || expandedAreas.has(area);
                    return (
                      <React.Fragment key={area}>
                        {!singleArea && (
                          <div
                            className="text-meta font-semibold uppercase text-cream/50 tracking-[0.08em] cursor-pointer rounded py-2 pb-1 px-4 pl-6 flex items-baseline hover:text-cream/80"
                            onClick={() => handleAreaClick(area)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleAreaClick(area);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-expanded={isAreaExpanded}
                          >
                            <span className="text-micro mr-1 inline-block w-2.5">
                              <FontAwesomeIcon
                                icon={
                                  isAreaExpanded
                                    ? faChevronDown
                                    : faChevronRight
                                }
                                className="text-meta"
                              />
                            </span>
                            {area}
                            <span className="ml-auto text-meta font-normal text-cream/40">
                              {trails.length}
                            </span>
                          </div>
                        )}
                        {isAreaExpanded &&
                          trails.map((trail) => (
                            <TrailRow
                              key={trail.trailName}
                              trail={trail}
                              selectedTrail={selectedTrail}
                              onTrailSelect={onTrailSelect}
                            />
                          ))}
                      </React.Fragment>
                    );
                  })}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
