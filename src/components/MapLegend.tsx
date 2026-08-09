'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MAP_EVENTS } from '@/events';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faLayerGroup,
  faBicycle,
  faMountain,
  faStopwatch,
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
import { MyRides } from './sidebar/MyRides';
import { NavRail, type RailItem } from './sidebar/NavRail';
import { Wordmark } from './sidebar/Wordmark';
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
import { getMapLayerSettings, type MapLayerSettings } from '@/data/map-layers';
import { getMountainBikeTrails } from '@/data/trail-source';

/** Whether this city has any casual-route content to show at all. */
const hasRoutesData =
  bikeRoutes.length > 0 ||
  mapFeatures.length > 0 ||
  bikeResources.length > 0 ||
  Boolean(mapConfig.gbfs);

/** The three things the panel can show. */
type Section = 'rides' | 'routes' | 'trails';

/** The phone's section pills. Clay for the current one, like the rail. */
const PILL_CLASS =
  'flex-1 py-1.5 px-4 text-ui font-semibold rounded-full transition-colors';
const PILL_ON = 'bg-clay text-forest';
const PILL_OFF = 'text-cream/60 hover:text-cream';

/**
 * Which sections this deployment offers.
 *
 * Two gates, and both have to pass: the city has to have the content, and an
 * admin has to want it offered. Mountain trails are always on — they are what
 * the app is for, and a rider looking at a map with nothing on it is not a
 * configuration anyone meant to reach.
 */
function sectionsFor(layers: MapLayerSettings): {
  items: RailItem[];
  rides: boolean;
  routes: boolean;
} {
  const routes = hasRoutesData && layers.casualRoutes;
  const rides = layers.rides;
  return {
    items: [
      ...(routes
        ? [{ icon: faBicycle, key: 'routes', label: 'Casual routes' }]
        : []),
      { icon: faMountain, key: 'trails', label: 'Mountain trails' },
      ...(rides
        ? [{ icon: faStopwatch, key: 'rides', label: 'My rides' }]
        : []),
    ],
    rides,
    routes,
  };
}

// Main provider component
export function MapLegendProvider({ children }: { children: React.ReactNode }) {
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
  // Fixed for the life of the page — the admin's answer, not a preference.
  const {
    items: railItems,
    rides: hasRidesSection,
    routes: hasRoutesSection,
  } = sectionsFor(getMapLayerSettings());
  /**
   * One section means nothing to navigate between, so the rail is dead weight
   * — a column of one button labelling the only thing there is. Without it the
   * panel needs the phone's reveal button back on desktop, since pressing the
   * current rail item was the only way to a full-width map.
   */
  const showRail = railItems.length > 1;
  const [activeSection, setActiveSection] = useState<Section>(() => {
    const saved = getSetting('activeTab');
    // A saved tab for a section since switched off would leave the panel
    // showing nothing, so each is checked against what is on offer now.
    if (saved === 'routes' && hasRoutesSection) return saved;
    if (saved === 'trails') return saved;
    if (saved === 'rides' && hasRidesSection) return saved;
    if (getRideStyle() === 'mountain') return 'trails';
    return hasRoutesSection ? 'routes' : 'trails';
  });
  // Stable in practice: both flags come from a module store the server fills
  // once per page, so the listeners below never re-register.
  const switchTab = useCallback(
    (tab: Section) => {
      if (tab === 'routes' && !hasRoutesSection) return;
      if (tab === 'rides' && !hasRidesSection) return;
      setActiveSection(tab);
      setSetting('activeTab', tab);
    },
    [hasRidesSection, hasRoutesSection],
  );
  // Add state for map layers
  const [showAttractions, setShowAttractions] = useState(false);
  const [showBikeResources, setShowBikeResources] = useState(false);
  const [showBikeRentals, setShowBikeRentals] = useState(false);
  const [showOsmTrails, setShowOsmTrails] = useState(false);
  // Whether the nationwide toggle is offered at all — an admin setting, fixed
  // for the life of the page, so it is read rather than held in state.
  const offerOsmTrails = getMapLayerSettings().osmTrails;
  const [showBikeNetwork, setShowBikeNetwork] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Whether the list is showing.
   *
   * Desktop is always open — the panel is a column of the layout, not something
   * over the map, so hiding it buys back space nothing was covering. On a phone
   * it is the sheet's position: anything above Peek counts as open.
   */
  const isOpen = narrow ? snap !== PEEK : true;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const toggle = useCallback(() => {
    // Phone only. A sheet is never closed — the button moves it between resting
    // and browsing, which is what "open the list" means there.
    setSnap((current) => (current === PEEK ? HALF : PEEK));
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
      // Desktop falls through: the panel is a column, and clicking the map is
      // not a request to give up a third of the layout.
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
  }, [switchTab]);

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

  /**
   * Tell whoever is recording whether the rides list is on screen.
   *
   * The HUD over the map exists to say the clock is running while you are
   * looking at something else; showing it above the same numbers in the panel
   * would just be twice.
   *
   * On a phone the sheet at Peek is showing a strip of nothing, so that counts
   * as not visible.
   */
  useEffect(() => {
    const visible = activeSection === 'rides' && isOpen;
    window.dispatchEvent(
      new CustomEvent(MAP_EVENTS.RIDES_PANEL_TOGGLE, {
        detail: { isOpen: visible },
      }),
    );
  }, [activeSection, isOpen, narrow, snap]);

  /**
   * Selecting a ride from somewhere else (the elevation dock's "see this ride")
   * brings the list up. The request comes as a flag on RIDE_SELECT rather than
   * an event of its own, because the section state lives here.
   */
  useEffect(() => {
    const handler = (event: Event) => {
      if ((event as CustomEvent).detail?.openPanel) {
        setActiveSection('rides');
        setSetting('activeTab', 'rides');
        if (narrowRef.current) {
          setSnap(HALF);
        }
      }
    };
    window.addEventListener(MAP_EVENTS.RIDE_SELECT, handler);
    return () => window.removeEventListener(MAP_EVENTS.RIDE_SELECT, handler);
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
        Phone only. Desktop has nothing for it to do: the panel is a column of
        the layout rather than something over the map, so there is no space to
        win back by hiding it — and a button that sat over the list it was
        supposed to reveal was worse than no button.
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
          'z-drawer overflow-hidden flex bg-forest',
          narrow
            ? cn(
                'fixed flex-col left-0 right-0 bottom-0 h-[92%] rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.16)]',
                !dragging && 'transition-transform duration-300 ease-in-out',
              )
            : cn(
                // `order-first` rather than moving it in the DOM: the provider
                // renders children before the panel, and reordering that would
                // change what every consumer sees.
                'relative order-first flex-none flex-row h-full shadow-[2px_0_16px_rgba(14,34,41,0.10)]',
                // 320px of list, plus the rail when there is one.
                showRail ? 'w-[376px]' : 'w-[320px]',
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
            <span className="block w-9 h-1 rounded-full bg-cream/25" />
          </button>
        )}

        {/* Desktop: the rail sits beside the content and only switches
            sections. There is nothing to collapse. */}
        {!narrow && showRail && (
          <NavRail
            active={activeSection}
            items={railItems}
            onSelect={(key) => switchTab(key as Section)}
          />
        )}

        {!narrow && (
          <div
            className={cn(
              'absolute top-0 w-[320px] px-[18px] pt-[18px] pb-3.5 border-b border-cream/10 pointer-events-none',
              showRail ? 'left-14' : 'left-0',
            )}
          >
            <Wordmark />
          </div>
        )}

        <div
          className={cn(
            'flex-1 min-w-0 flex flex-col overflow-hidden',
            !narrow && 'pt-[58px]',
          )}
        >
          {/* The phone has no rail, so it keeps the pill — for the same
              reason the rail goes, one section gets no pill either. */}
          {showRail && (
            <div className="md:hidden flex justify-center items-center px-4 pl-[68px] pb-3 pt-1">
              <div className="flex bg-cream/[0.08] rounded-full p-1 w-full">
                {hasRoutesSection && (
                  <button
                    type="button"
                    className={cn(
                      PILL_CLASS,
                      activeSection === 'routes' ? PILL_ON : PILL_OFF,
                    )}
                    onClick={() => switchTab('routes')}
                  >
                    Casual
                  </button>
                )}
                <button
                  type="button"
                  className={cn(
                    PILL_CLASS,
                    activeSection === 'trails' ? PILL_ON : PILL_OFF,
                  )}
                  onClick={() => switchTab('trails')}
                >
                  MTB
                </button>
                {/* Rides need a pill of their own here rather than the button
                    that used to float over the map. */}
                {hasRidesSection && (
                  <button
                    type="button"
                    className={cn(
                      PILL_CLASS,
                      activeSection === 'rides' ? PILL_ON : PILL_OFF,
                    )}
                    onClick={() => switchTab('rides')}
                  >
                    Rides
                  </button>
                )}
              </div>
            </div>
          )}

          {/* The sheet sits on the bottom edge, so the last row would otherwise
              end up under the home indicator. */}
          <div className="overflow-y-auto flex-1 min-h-0">
            <div className="px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
                  {/* The whole section, not just the row: it is the only
                      layer the Trails tab offers, so a bare "Map layers"
                      heading over nothing would read as something failing to
                      load. */}
                  {offerOsmTrails && (
                    <MapLayersSection>
                      <ToggleRow
                        icon={faMountain}
                        label="Nationwide trails"
                        isActive={showOsmTrails}
                        onToggle={toggleOsmTrailsLayer}
                      />
                    </MapLayersSection>
                  )}

                  {getMountainBikeTrails().length > 0 && (
                    <MountainBikeTrails
                      selectedTrail={selectedTrail}
                      onTrailSelect={handleTrailSelect}
                      onAreaSelect={handleAreaSelect}
                    />
                  )}
                </>
              )}

              {activeSection === 'rides' && hasRidesSection && <MyRides />}

              <InformationSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
