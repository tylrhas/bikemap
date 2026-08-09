import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MapLegendProvider } from './MapLegend';
import { MAP_EVENTS } from '@/events';
import { SNAP_FRACTIONS, PEEK, HALF } from '@/utils/sheet-snap';

/**
 * The mobile sheet. The setup file's matchMedia reports desktop, so these
 * override it — which is also the point: desktop must not grow a drag handle.
 */
function setViewport(narrow: boolean) {
  window.matchMedia = ((query: string) => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: narrow,
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

// Mock all sidebar children to keep tests focused on MapLegendProvider state
vi.mock('./sidebar', () => ({
  BikeRoutes: ({
    selectedRoute,
    onRouteSelect,
  }: {
    selectedRoute: string | null;
    onRouteSelect: (id: string) => void;
  }) => (
    <div data-testid="bike-routes" data-selected-route={selectedRoute ?? ''}>
      <button type="button" onClick={() => onRouteSelect('route-1')}>
        Select Route
      </button>
    </div>
  ),
  MountainBikeTrails: ({
    selectedTrail,
    onTrailSelect,
    onAreaSelect,
  }: {
    selectedTrail: string | null;
    onTrailSelect: (name: string) => void;
    onAreaSelect: (name: string) => void;
  }) => (
    <div
      data-testid="mountain-bike-trails"
      data-selected-trail={selectedTrail ?? ''}
    >
      <button type="button" onClick={() => onTrailSelect('Trail A')}>
        Select Trail
      </button>
      <button type="button" onClick={() => onAreaSelect('Raccoon Mountain')}>
        Select Area
      </button>
    </div>
  ),
  MapLayers: () => <div data-testid="map-layers" />,
  MapLayersSection: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-layers-section">{children}</div>
  ),
  ToggleRow: ({
    label,
    isActive,
    onToggle,
  }: {
    label: string;
    isActive: boolean;
    onToggle: () => void;
  }) => (
    <button type="button" onClick={onToggle} data-active={isActive}>
      {label}
    </button>
  ),
  AttractionsList: () => <div data-testid="attractions" />,
  BikeResourcesList: () => <div data-testid="bike-resources" />,
  BikeRentalList: () => <div data-testid="bike-rentals" />,
  InformationSection: () => <div data-testid="info" />,
}));

vi.mock('./styles', () => ({
  TOGGLE_BTN_CLASS: 'toggle-btn',
  TOGGLE_ICON_CLASS: 'toggle-icon',
}));

const mockRideStyle: string | null = null;
vi.mock('./WelcomeModal', () => ({
  getRideStyle: () => mockRideStyle,
}));

const handle = () => screen.queryByRole('button', { name: /drag to resize/i });
const sheet = () => handle()?.parentElement as HTMLElement | undefined;

describe('MapLegend as a bottom sheet', () => {
  beforeEach(() => setViewport(true));

  it('grows a drag handle on a phone', () => {
    render(<MapLegendProvider>{null}</MapLegendProvider>);
    expect(handle()).toBeInTheDocument();
  });

  it('has no handle on desktop, where it stays a drawer', () => {
    setViewport(false);
    render(<MapLegendProvider>{null}</MapLegendProvider>);
    expect(handle()).not.toBeInTheDocument();
  });

  it('rests at half before anything is selected', () => {
    render(<MapLegendProvider>{null}</MapLegendProvider>);
    expect(sheet()?.style.transform).toBe(
      `translateY(${SNAP_FRACTIONS[HALF] * 100}%)`,
    );
  });

  it('drops to peek when a trail is selected, so the map is visible', () => {
    render(<MapLegendProvider>{null}</MapLegendProvider>);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(MAP_EVENTS.TRAIL_SELECT, {
          detail: { trailName: 'Pondo' },
        }),
      );
    });
    expect(sheet()?.style.transform).toBe(
      `translateY(${SNAP_FRACTIONS[PEEK] * 100}%)`,
    );
  });

  it('arrow keys move it between stops', () => {
    render(<MapLegendProvider>{null}</MapLegendProvider>);
    const grip = handle() as HTMLElement;

    act(() => {
      grip.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }),
      );
    });
    expect(sheet()?.style.transform).toBe('translateY(0%)');
  });

  it('tells the rest of the app it is open whenever it is above peek', () => {
    // The camera and the elevation pane both key off this.
    const seen: boolean[] = [];
    const listener = (e: Event) => seen.push((e as CustomEvent).detail.isOpen);
    window.addEventListener(MAP_EVENTS.SIDEBAR_TOGGLE, listener);

    render(<MapLegendProvider>{null}</MapLegendProvider>);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(MAP_EVENTS.TRAIL_SELECT, {
          detail: { trailName: 'Pondo' },
        }),
      );
    });

    window.removeEventListener(MAP_EVENTS.SIDEBAR_TOGGLE, listener);
    expect(seen[0]).toBe(true); // half
    expect(seen.at(-1)).toBe(false); // peek
  });
});
