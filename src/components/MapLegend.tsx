'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MAP_EVENTS } from '@/events';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faLayerGroup,
  faBicycle,
  faMountain,
} from '@fortawesome/free-solid-svg-icons';

import {
  BikeRoutes,
  MountainBikeTrails,
  MapLayers,
  MapLayersSection,
  ToggleRow,
  BikeNetworkLayer,
  AttractionsList,
  BikeResourcesList,
  BikeRentalList,
  InformationSection,
  type LocationProps,
} from './sidebar';
import { getRideStyle } from './WelcomeModal';
import { getSetting, setSetting } from '@/utils/settings';
import { useIsNarrow } from '@/hooks/useIsNarrow';
import { NavRail, type RailItem } from './sidebar/NavRail';
import {
  clampSnap,
  dragFraction,
  HALF,
  nearestSnap,
  PEEK,
  SNAP_FRACTIONS,
} from '@/utils/sheet-snap';
import { TOGGLE_BTN_CLASS, TOGGLE_ICON_CLASS } from './styles';
import { cn } from '@/lib/utils';
import { mapConfig } from '@/config/map.config';
import {
  bikeNetworkUrl,
  bikeResources,
  bikeRoutes,
  mapFeatures,
} from '@/data/geo_data';
import { getMountainBikeTrails } from '@/data/trail-source';

const hasRoutesSection =
  bikeRoutes.length > 0 ||
  mapFeatures.length > 0 ||
  bikeResources.length > 0 ||
  Boolean(mapConfig.gbfs);
const hasTrailsSection = true;

/** What the desktop rail offers. Mirrors the sections the panel can show. */
const RAIL_ITEMS: RailItem[] = [
  ...(hasRoutesSection
    ? [{ icon: faBicycle, key: 'routes', label: 'Casual routes' }]
    : []),
  { icon: faMountain, key: 'trails', label: 'Mountain trails' },
];

// Main provider component
export function MapLegendProvider({ children }: { children: React.ReactNode }) {
  // Track state in this parent component
  const [isOpen, setIsOpen] = useState(() => getSetting('sidebarOpen') ?? true);
  const narrow = useIsNarrow();
  /**
   * Which stop the mobile sheet rests at. Desktop ignores it entirely and keeps
   * the drawer, because a sheet would throw away horizontal space there.
   */
  const [snap, setSnap] = useState(HALF);
  const sheetRef = useRef<HTMLDivElement>(null);
  // `toggle` is deliberately stable; the breakpoint reaches it through a ref
  // rather than becoming a dependency that rebuilds every listener.
  const narrowRef = useRef(false);
  const dragRef = useRef<{ startFraction: number; startY: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const [dragged, setDragged] = useState<null | number>(null);
  narrowRef.current = narrow;
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'routes' | 'trails'>(
    () => {
      const saved = getSetting('activeTab');
      if (saved === 'routes' && hasRoutesSection) return saved;
      if (saved === 'trails' && hasTrailsSection) return saved;
      if (getRideStyle() === 'mountain' && hasTrailsSection) return 'trails';
      return hasRoutesSection ? 'routes' : 'trails';
    },
  );
  const switchTab = (tab: 'routes' | 'trails') => {
    if (tab === 'routes' && !hasRoutesSection) return;
    if (tab === 'trails' && !hasTrailsSection) return;
    setActiveSection(tab);
    setSetting('activeTab', tab);
  };
  // Add state for map layers
  const [showAttractions, setShowAttractions] = useState(false);
  const [showBikeResources, setShowBikeResources] = useState(false);
  const [showBikeRentals, setShowBikeRentals] = useState(false);
  const [showOsmTrails, setShowOsmTrails] = useState(false);
  const [showBikeNetwork, setShowBikeNetwork] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const toggle = useCallback(() => {
    // A sheet is never closed — the button moves it between resting and
    // browsing instead, which is what "open the list" means there.
    if (narrowRef.current) {
      setSnap((current) => (current === PEEK ? HALF : PEEK));
      return;
    }
    const next = !isOpenRef.current;
    setIsOpen(next);
    setSetting('sidebarOpen', next);
    window.dispatchEvent(
      new CustomEvent(MAP_EVENTS.SIDEBAR_TOGGLE, {
        detail: { isOpen: next },
      }),
    );
  }, []);

  /**
   * Picking a trail drops the sheet to Peek, so the map you just aimed at is
   * visible. This is the state a rider spends most of their time in.
   */
  useEffect(() => {
    if (!narrow) {
      return;
    }
    const toPeek = () => setSnap(PEEK);
    window.addEventListener(MAP_EVENTS.TRAIL_SELECT, toPeek);
    window.addEventListener(MAP_EVENTS.ROUTE_SELECT, toPeek);
    return () => {
      window.removeEventListener(MAP_EVENTS.TRAIL_SELECT, toPeek);
      window.removeEventListener(MAP_EVENTS.ROUTE_SELECT, toPeek);
    };
  }, [narrow]);

  /**
   * The sheet is never "closed", so the rest of the app is told it is open
   * whenever it is above Peek — that is what `isOpen` means to the camera and
   * to the elevation pane.
   */
  useEffect(() => {
    if (!narrow) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent(MAP_EVENTS.SIDEBAR_TOGGLE, {
        detail: { isOpen: snap !== PEEK },
      }),
    );
  }, [narrow, snap]);

  const onHandleDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      dragRef.current = {
        startFraction: SNAP_FRACTIONS[snap],
        startY: event.clientY,
      };
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [snap],
  );

  const onHandleMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const start = dragRef.current;
      const height = sheetRef.current?.offsetHeight ?? 0;
      if (!start) {
        return;
      }
      setDragged(
        dragFraction(start.startFraction, event.clientY - start.startY, height),
      );
    },
    [],
  );

  const onHandleUp = useCallback(() => {
    if (dragged !== null) {
      setSnap(nearestSnap(dragged));
    }
    dragRef.current = null;
    setDragging(false);
    setDragged(null);
  }, [dragged]);

  // Handle clicks/taps outside the sidebar (mobile only)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (window.innerWidth > 768) return;
      if (narrowRef.current) {
        // The sheet gets out of the way rather than being dismissed; there is
        // nothing to dismiss it to.
        if (
          !toggleButtonRef.current?.contains(event.target as Node) &&
          !sidebarRef.current?.contains(event.target as Node)
        ) {
          setSnap(PEEK);
        }
        return;
      }
      if (!isOpen) return;
      if (toggleButtonRef.current?.contains(event.target as Node)) return;
      if (sidebarRef.current?.contains(event.target as Node)) return;

      toggle();
    };

    // Use capture phase so we see the event before it reaches sidebar children
    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isOpen, toggle]);

  // Listen for route-select events from the map (when user clicks on a route in the map)
  useEffect(() => {
    const handleMapRouteSelect = (event: Event) => {
      const customEvent = event as CustomEvent<{ routeId: string }>;
      const { routeId } = customEvent.detail;
      // Only update state, don't dispatch another event (map already handles the visual update)
      setSelectedRoute(routeId);
      setSelectedTrail(null);
    };

    window.addEventListener(MAP_EVENTS.ROUTE_SELECT, handleMapRouteSelect);
    return () => {
      window.removeEventListener(MAP_EVENTS.ROUTE_SELECT, handleMapRouteSelect);
    };
  }, []);

  // Listen for trail-select events from the map (when user clicks on a mountain bike trail)
  useEffect(() => {
    const handleMapTrailSelect = (event: Event) => {
      const customEvent = event as CustomEvent<{ trailName: string }>;
      const { trailName } = customEvent.detail;
      setSelectedTrail(trailName);
      setSelectedRoute(null);
      setActiveSection('trails');
    };

    window.addEventListener(MAP_EVENTS.TRAIL_SELECT, handleMapTrailSelect);
    return () => {
      window.removeEventListener(MAP_EVENTS.TRAIL_SELECT, handleMapTrailSelect);
    };
  }, []);

  // Listen for ride style chosen from welcome modal
  useEffect(() => {
    const handler = (e: Event) => {
      const { style } = (e as CustomEvent).detail;
      const tab = style === 'mountain' ? 'trails' : 'routes';
      switchTab(tab);
    };

    window.addEventListener(MAP_EVENTS.RIDE_STYLE_CHOSEN, handler);
    return () =>
      window.removeEventListener(MAP_EVENTS.RIDE_STYLE_CHOSEN, handler);
  }, []);

  // Function to handle route selection
  const handleRouteSelect = useCallback(
    (routeId: string) => {
      setSelectedRoute(routeId);
      setSelectedTrail(null);

      // Dispatch event for map to update route opacity
      window.dispatchEvent(
        new CustomEvent(MAP_EVENTS.ROUTE_SELECT, {
          detail: { routeId },
        }),
      );
      window.dispatchEvent(new CustomEvent(MAP_EVENTS.TRAIL_DESELECT));

      // Close sidebar on mobile after selection
      if (window.innerWidth <= 768 && isOpen) {
        toggle();
      }
    },
    [isOpen, toggle],
  );

  // Function to handle trail selection
  const handleTrailSelect = useCallback(
    (trailName: string) => {
      setSelectedTrail(trailName);
      setSelectedRoute(null);

      window.dispatchEvent(
        new CustomEvent(MAP_EVENTS.TRAIL_SELECT, {
          detail: { trailName },
        }),
      );
      window.dispatchEvent(new CustomEvent(MAP_EVENTS.ROUTE_DESELECT));

      if (window.innerWidth <= 768 && isOpen) {
        toggle();
      }
    },
    [isOpen, toggle],
  );

  // Function to handle area (rec area heading) selection
  const handleAreaSelect = useCallback((areaName: string) => {
    setSelectedTrail(null);
    setSelectedRoute(null);

    // Deselect first — trail-deselect resets mountain bike opacity,
    // so it must fire before area-select sets the highlight
    window.dispatchEvent(new CustomEvent(MAP_EVENTS.ROUTE_DESELECT));
    window.dispatchEvent(new CustomEvent(MAP_EVENTS.TRAIL_DESELECT));
    window.dispatchEvent(
      new CustomEvent(MAP_EVENTS.AREA_SELECT, {
        detail: { areaName },
      }),
    );
  }, []);

  // Helper to toggle a layer with radio-button behavior:
  // turning one layer ON turns the other two OFF
  const toggleLayer = useCallback(
    (layer: 'attractions' | 'bikeResources' | 'bikeRentals') => {
      const stateMap = {
        attractions: showAttractions,
        bikeResources: showBikeResources,
        bikeRentals: showBikeRentals,
      };
      const setterMap = {
        attractions: setShowAttractions,
        bikeResources: setShowBikeResources,
        bikeRentals: setShowBikeRentals,
      };

      const turningOn = !stateMap[layer];

      // Update state and dispatch events for all layers
      for (const key of Object.keys(stateMap) as Array<keyof typeof stateMap>) {
        const newValue = key === layer ? turningOn : false;
        if (stateMap[key] !== newValue) {
          setterMap[key](newValue);
          window.dispatchEvent(
            new CustomEvent(MAP_EVENTS.LAYER_TOGGLE, {
              detail: { layer: key, visible: newValue },
            }),
          );
        }
      }
    },
    [showAttractions, showBikeResources, showBikeRentals],
  );

  const toggleAttractionLayer = useCallback(
    () => toggleLayer('attractions'),
    [toggleLayer],
  );

  const toggleBikeResourcesLayer = useCallback(
    () => toggleLayer('bikeResources'),
    [toggleLayer],
  );

  const toggleBikeRentalsLayer = useCallback(
    () => toggleLayer('bikeRentals'),
    [toggleLayer],
  );

  // Nationwide OSM bike trails toggle independently of the marker layers
  // (it's a vector line layer, not part of the radio-button marker group).
  // Compute next, set, then dispatch — dispatching inside the setState updater
  // would double-fire under React StrictMode's double-invoked updaters.
  const toggleOsmTrailsLayer = useCallback(() => {
    const next = !showOsmTrails;
    setShowOsmTrails(next);
    window.dispatchEvent(
      new CustomEvent(MAP_EVENTS.LAYER_TOGGLE, {
        detail: { layer: 'osmTrails', visible: next },
      }),
    );
  }, [showOsmTrails]);

  // Classified bike-network overlay (Casual mode), independent of the markers.
  const toggleBikeNetworkLayer = useCallback(() => {
    const next = !showBikeNetwork;
    setShowBikeNetwork(next);
    window.dispatchEvent(
      new CustomEvent(MAP_EVENTS.LAYER_TOGGLE, {
        detail: { layer: 'bikeNetwork', visible: next },
      }),
    );
  }, [showBikeNetwork]);

  // Function to center map on a specific location
  const centerOnLocation = useCallback(
    (location: LocationProps) => {
      // Dispatch event for map to center and show pin
      window.dispatchEvent(
        new CustomEvent(MAP_EVENTS.CENTER_LOCATION, {
          detail: {
            location: location,
          },
        }),
      );

      // Close sidebar on mobile after selection
      if (window.innerWidth <= 768 && isOpen) {
        toggle();
      }
    },
    [isOpen, toggle],
  );

  // Listen for route-deselect event
  useEffect(() => {
    const handleRouteDeselect = () => {
      setSelectedRoute(null);
    };

    window.addEventListener(MAP_EVENTS.ROUTE_DESELECT, handleRouteDeselect);

    return () => {
      window.removeEventListener(
        MAP_EVENTS.ROUTE_DESELECT,
        handleRouteDeselect,
      );
    };
  }, []);

  // Listen for trail-deselect event
  useEffect(() => {
    const handleTrailDeselect = () => {
      setSelectedTrail(null);
    };

    window.addEventListener(MAP_EVENTS.TRAIL_DESELECT, handleTrailDeselect);

    return () => {
      window.removeEventListener(
        MAP_EVENTS.TRAIL_DESELECT,
        handleTrailDeselect,
      );
    };
  }, []);

  // Close when rides panel opens
  useEffect(() => {
    const handler = (e: Event) => {
      const { isOpen: panelOpen } = (e as CustomEvent).detail;
      if (panelOpen && isOpenRef.current) {
        setIsOpen(false);
      }
    };
    window.addEventListener(MAP_EVENTS.RIDES_PANEL_TOGGLE, handler);
    return () =>
      window.removeEventListener(MAP_EVENTS.RIDES_PANEL_TOGGLE, handler);
  }, []);

  return (
    /*
      The layout row. On desktop the panel is a column in it and the map takes
      the rest, so the map's viewport is the part you can see — which is what
      lets the offsets below disappear. On a phone the sheet floats over the
      map instead, and this is just a full-bleed container.
    */
    <div className="flex h-full w-full overflow-hidden">
      {children}

      {/*
        Only on a phone. On desktop the panel is always open and the rail is
        how you change what it shows, so a button to reveal it had nothing left
        to do.
      */}
      <div
        className={cn(
          'fixed left-4 top-[calc(1rem+env(safe-area-inset-top))] md:hidden',
          isOpen ? 'z-drawer-toggle-open' : 'z-drawer-toggle',
        )}
      >
        <button
          ref={toggleButtonRef}
          onClick={toggle}
          className={TOGGLE_BTN_CLASS}
          type="button"
        >
          <FontAwesomeIcon
            icon={isOpen ? faTimes : faLayerGroup}
            className={TOGGLE_ICON_CLASS}
          />
        </button>
      </div>

      {/*
        One element, two shells. On a phone it is a bottom sheet resting at one
        of three stops; from `md` up it stays the drawer it always was, because
        a sheet there would throw away the horizontal space desktop has.
      */}
      <div
        ref={(node) => {
          sidebarRef.current = node;
          sheetRef.current = node;
        }}
        className={cn(
          'bg-white z-drawer overflow-hidden flex',
          narrow
            ? cn(
                'fixed flex-col left-0 right-0 bottom-0 h-[92%] rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.16)]',
                !dragging && 'transition-transform duration-300 ease-in-out',
              )
            : cn(
                // `order-first` rather than moving it in the DOM: the provider
                // renders children before the panel, and reordering that would
                // change what every consumer sees.
                'relative order-first flex-none flex-row h-full shadow-[2px_0_16px_rgba(14,34,41,0.10)] transition-[width] duration-300 ease-in-out',
                isOpen ? 'w-[376px]' : 'w-14',
              ),
        )}
        style={
          narrow
            ? {
                transform: `translateY(${(dragged ?? SNAP_FRACTIONS[snap]) * 100}%)`,
              }
            : undefined
        }
      >
        {narrow && (
          <button
            type="button"
            aria-label="Drag to resize, or use the arrow keys"
            className="flex-none w-full grid place-items-center py-2.5 cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSnap((current) => clampSnap(current + 1));
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSnap((current) => clampSnap(current - 1));
              }
            }}
          >
            <span className="block w-9 h-1 rounded-full bg-gray-300" />
          </button>
        )}

        {/*
          Desktop: the rail sits beside the content and stays put when the list
          collapses. Pressing the section already showing hides the list, which
          is the only way back to a full-width map now the toggle button is gone.
        */}
        {!narrow && (
          <NavRail
            active={activeSection}
            collapsed={!isOpen}
            items={RAIL_ITEMS}
            onSelect={(key) => {
              if (key === activeSection) {
                toggle();
                return;
              }
              switchTab(key as 'routes' | 'trails');
              if (!isOpenRef.current) {
                toggle();
              }
            }}
          />
        )}

        <div
          className={cn(
            'flex-1 min-w-0 flex flex-col overflow-hidden',
            // Collapsed the column is gone, not merely narrow — a sliver of
            // truncated trail names would be worse than none.
            !narrow && !isOpen && 'hidden',
          )}
        >
          {/* The phone has no rail, so it keeps the pill. */}
          <div className="md:hidden flex justify-center items-center py-[17px] px-4 pl-[68px] pb-3 border-b border-gray-200 bg-gray-50 pt-[calc(17px+env(safe-area-inset-top))]">
            <div className="flex bg-gray-100 rounded-full p-1 w-full border border-gray-200">
              {hasRoutesSection && (
                <button
                  type="button"
                  className={cn(
                    'flex-1 py-1.5 px-4 text-sm font-medium rounded-full transition-colors',
                    activeSection === 'routes'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                  onClick={() => switchTab('routes')}
                >
                  Casual
                </button>
              )}
              {hasTrailsSection && (
                <button
                  type="button"
                  className={cn(
                    'flex-1 py-1.5 px-4 text-sm font-medium rounded-full transition-colors',
                    activeSection === 'trails'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                  onClick={() => switchTab('trails')}
                >
                  MTB
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0">
            <div className="px-4 pb-4 pt-2">
              {activeSection === 'routes' && (
                <>
                  <BikeRoutes
                    selectedRoute={selectedRoute}
                    onRouteSelect={handleRouteSelect}
                  />

                  {bikeNetworkUrl && (
                    <BikeNetworkLayer
                      isActive={showBikeNetwork}
                      onToggle={toggleBikeNetworkLayer}
                    />
                  )}

                  <MapLayers
                    showAttractions={showAttractions}
                    showBikeResources={showBikeResources}
                    showBikeRentals={showBikeRentals}
                    onToggleAttractions={toggleAttractionLayer}
                    onToggleBikeResources={toggleBikeResourcesLayer}
                    onToggleBikeRentals={toggleBikeRentalsLayer}
                  />

                  <AttractionsList
                    show={showAttractions}
                    onCenterLocation={centerOnLocation}
                  />

                  <BikeResourcesList
                    show={showBikeResources}
                    onCenterLocation={centerOnLocation}
                  />

                  <BikeRentalList
                    show={showBikeRentals}
                    onCenterLocation={centerOnLocation}
                  />
                </>
              )}

              {activeSection === 'trails' && (
                <>
                  <MapLayersSection>
                    <ToggleRow
                      icon={faMountain}
                      label="Nationwide trails"
                      isActive={showOsmTrails}
                      onToggle={toggleOsmTrailsLayer}
                    />
                  </MapLayersSection>

                  {getMountainBikeTrails().length > 0 && (
                    <MountainBikeTrails
                      selectedTrail={selectedTrail}
                      onTrailSelect={handleTrailSelect}
                      onAreaSelect={handleAreaSelect}
                    />
                  )}
                </>
              )}

              <InformationSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
