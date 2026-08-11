import type mapboxgl from 'mapbox-gl';
import { describe, expect, it, vi } from 'vitest';
import { EVENT_COLOR } from '@/data/race-colors';
import {
  arrowImage,
  courseFeatures,
  flagImage,
  RACE_ARROWS_LAYER_ID,
  RACE_LINE_DASH,
  RACE_LINE_LAYER_ID,
  RACE_SOURCE_ID,
  setRaceCourse,
} from './race-overlay';

vi.mock('./map', () => ({
  firstTrailLabelLayerId: () => 'mtb-trails Label',
}));

/** The closure overlay's dash, from `setClosedTrails`. */
const CLOSED_COLOR = '#dc2626';
const CLOSED_DASH: [number, number] = [1.5, 1.5];

/** ~8 miles east, enough for several arrows at 1.5-mile spacing. */
const COURSE: [number, number][] = [
  [-121.4, 44.05],
  [-121.3, 44.05],
  [-121.25, 44.06],
];

const OVERLAY = {
  course: COURSE,
  direction: 'forward' as const,
  name: 'Cascade Gravel Grinder',
  originLabel: 'trailhead',
  terminusLabel: 'summit',
};

/** Records what a real map would have been told to do. */
function fakeMap() {
  const layers = new Map<string, { before?: string; spec: unknown }>();
  const images = new Set<string>();
  const sources = new Map<string, unknown>();
  let data: GeoJSON.FeatureCollection | null = null;

  return {
    addImage: (id: string) => images.add(id),
    addLayer: (spec: { id: string }, before?: string) =>
      layers.set(spec.id, { before, spec }),
    addSource: (id: string, source: unknown) => sources.set(id, source),
    data: () => data,
    getLayer: (id: string) => layers.get(id)?.spec,
    getSource: (id: string) =>
      sources.has(id)
        ? {
            setData: (next: GeoJSON.FeatureCollection) => {
              data = next;
            },
          }
        : undefined,
    hasImage: (id: string) => images.has(id),
    images,
    layers,
    removeImage: (id: string) => images.delete(id),
  };
}

/** The fake implements only what the overlay touches. */
function asMap(fake: unknown): mapboxgl.Map {
  return fake as mapboxgl.Map;
}

function paintOf(map: ReturnType<typeof fakeMap>, id: string) {
  return (map.layers.get(id)?.spec as { paint: Record<string, unknown> }).paint;
}

describe('courseFeatures', () => {
  it('spaces arrows by distance along the course', () => {
    // The uneven-vertex case lives in `geo-line.test.ts`; what matters here is
    // that the overlay actually asks for arc-length spacing rather than
    // dropping one per vertex.
    const arrows = courseFeatures(OVERLAY).features.filter(
      (f) => f.properties?.kind === 'arrow',
    );
    expect(arrows.length).toBeGreaterThan(2);
    expect(arrows.length).not.toBe(COURSE.length);
    for (const arrow of arrows) {
      expect(Number.isFinite(arrow.properties?.bearing)).toBe(true);
    }
  });

  it('puts start at the head of the line when run forwards', () => {
    const features = courseFeatures(OVERLAY).features;
    const start = features.find((f) => f.properties?.kind === 'start');
    const finish = features.find((f) => f.properties?.kind === 'finish');
    expect((start?.geometry as GeoJSON.Point).coordinates).toEqual(COURSE[0]);
    expect((finish?.geometry as GeoJSON.Point).coordinates).toEqual(
      COURSE[COURSE.length - 1],
    );
    expect(start?.properties?.label).toBe('Start · trailhead');
  });

  it('swaps the ends and reverses every arrow when run backwards', () => {
    // Data, not a paint expression — which is what makes it testable here.
    const reversed = courseFeatures({ ...OVERLAY, direction: 'reverse' });
    const start = reversed.features.find((f) => f.properties?.kind === 'start');
    expect((start?.geometry as GeoJSON.Point).coordinates).toEqual(
      COURSE[COURSE.length - 1],
    );
    expect(start?.properties?.label).toBe('Start · summit');

    const forwardBearing = courseFeatures(OVERLAY).features.find(
      (f) => f.properties?.kind === 'arrow',
    )?.properties?.bearing as number;
    const reverseBearing = reversed.features.find(
      (f) => f.properties?.kind === 'arrow',
    )?.properties?.bearing as number;
    expect(Math.abs(reverseBearing - forwardBearing)).toBeCloseTo(180, 0);
  });

  it('flies one flag, at the middle of the course', () => {
    const flags = courseFeatures(OVERLAY).features.filter(
      (f) => f.properties?.kind === 'flag',
    );
    expect(flags).toHaveLength(1);
    expect(flags[0].properties?.label).toBe('Cascade Gravel Grinder');
  });

  it('has nothing to draw without a line', () => {
    expect(courseFeatures({ ...OVERLAY, course: [] }).features).toEqual([]);
  });
});

describe('the corridor stays distinguishable from a closure', () => {
  it('draws the visible event line as long gold dashes', () => {
    const map = fakeMap();
    setRaceCourse(asMap(map), OVERLAY);
    const line = paintOf(map, RACE_LINE_LAYER_ID);

    expect(line['line-color']).toBe(EVENT_COLOR);
    expect(line['line-dasharray']).toEqual(RACE_LINE_DASH);
    expect(RACE_LINE_DASH[0]).toBeGreaterThan(RACE_LINE_DASH[1]);
    expect(RACE_LINE_DASH).not.toEqual(CLOSED_DASH);
  });

  it('never borrows the closure red', () => {
    const map = fakeMap();
    setRaceCourse(asMap(map), OVERLAY);
    expect(paintOf(map, RACE_LINE_LAYER_ID)['line-color']).toBe(EVENT_COLOR);
    expect(paintOf(map, RACE_LINE_LAYER_ID)['line-color']).not.toBe(
      CLOSED_COLOR,
    );
  });
});

describe('setRaceCourse', () => {
  it('slots the overlay beneath the trail name cards', () => {
    // Above the line, its closure dash and its hit target — so a racing trail
    // is still tappable — but below the labels, which would otherwise read
    // through a wash of gold.
    const map = fakeMap();
    setRaceCourse(asMap(map), OVERLAY);
    for (const [, entry] of map.layers) {
      expect(entry.before).toBe('mtb-trails Label');
    }
  });

  it('registers its sprites before the layers that name them', () => {
    // A layer pointing at a missing image draws nothing, and logs nothing.
    const map = fakeMap();
    const order: string[] = [];
    const withOrder = {
      ...map,
      addImage: (id: string) => {
        order.push(`image:${id}`);
        return map.images.add(id);
      },
      addLayer: (spec: { id: string }, before?: string) => {
        order.push(`layer:${spec.id}`);
        map.addLayer(spec, before);
      },
    };
    setRaceCourse(asMap(withOrder), OVERLAY);
    expect(order[0]).toMatch(/^image:/);
    expect(order.indexOf(`layer:${RACE_ARROWS_LAYER_ID}`)).toBeGreaterThan(
      order.findIndex((o) => o.startsWith('image:')),
    );
  });

  it('does not re-register sprites during a data refresh', () => {
    const map = fakeMap();
    let registrations = 0;
    const counting = {
      ...map,
      addImage: (id: string) => {
        registrations++;
        map.images.add(id);
      },
    };

    setRaceCourse(asMap(counting), OVERLAY);
    setRaceCourse(asMap(counting), OVERLAY);
    expect(registrations).toBe(2);
  });

  it('clears with an empty collection rather than removing layers', () => {
    // Same philosophy as the closure filter that matches nothing: adding and
    // removing layers on every day boundary is a good way to lose one.
    const map = fakeMap();
    setRaceCourse(asMap(map), OVERLAY);
    const drawn = map.layers.size;

    setRaceCourse(asMap(map), null);
    expect(map.layers.size).toBe(drawn);
    expect(map.data()?.features).toEqual([]);
  });

  it('adds each layer once across repeated calls', () => {
    const map = fakeMap();
    setRaceCourse(asMap(map), OVERLAY);
    const first = map.layers.size;
    setRaceCourse(asMap(map), OVERLAY);
    expect(map.layers.size).toBe(first);
    expect(map.getSource(RACE_SOURCE_ID)).toBeDefined();
  });

  it('survives a map that throws', () => {
    // A race is decoration on a working map; it must never take one down.
    const broken = {
      addLayer: () => {
        throw new Error('style not ready');
      },
      addSource: () => {},
      getLayer: () => undefined,
      getSource: () => undefined,
      hasImage: () => false,
      addImage: () => {},
      removeImage: () => {},
    };
    expect(() => setRaceCourse(asMap(broken), OVERLAY)).not.toThrow();
  });
});

describe('the sprites', () => {
  it('are alpha masks, so `icon-color` can tint them', () => {
    for (const image of [arrowImage(), flagImage()]) {
      expect(image.data).toHaveLength(image.width * image.height * 4);
      const alphas = [];
      for (let i = 3; i < image.data.length; i += 4) {
        alphas.push(image.data[i]);
      }
      // Something is drawn, and it does not fill the tile.
      expect(alphas.some((a) => a === 255)).toBe(true);
      expect(alphas.some((a) => a === 0)).toBe(true);
      // White throughout: an SDF takes its colour from the paint property.
      expect(image.data[0]).toBe(255);
    }
  });

  it('draws the arrow symmetrically about its centre', () => {
    // It points along a bearing, so a lopsided glyph would skew every heading.
    const size = 16;
    const { data } = arrowImage(size);
    const alphaAt = (x: number, y: number) => data[(y * size + x) * 4 + 3];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size / 2; x++) {
        expect(alphaAt(x, y)).toBe(alphaAt(size - 1 - x, y));
      }
    }
  });
});
