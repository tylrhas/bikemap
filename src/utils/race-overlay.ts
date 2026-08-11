/**
 * The race course, drawn on the map.
 *
 * A gold dashed line with direction arrows, start and finish markers, and a
 * flag for overview zoom.
 *
 * **Its own GeoJSON source, not a filter on the trail tileset.** Three reasons,
 * and each is enough on its own: a filter cannot express `courseGpx`, which is
 * the whole point of that field; a sublayer added here is not in the five-id
 * filter list `initMtnBikeLayers` maintains, so on an `osmId`-matched layer it
 * would quietly draw uncurated nationwide ways; and the arrows and endpoints
 * need coordinates in JavaScript regardless, while `querySourceFeatures` only
 * ever returns the tiles currently in view.
 *
 * **An overlay, never a repaint of the trail layer.**
 * `updateMtnBikeOpacity(map, null)` rewrites `line-opacity` and `line-width` on
 * the base layer wholesale on every deselect, so anything encoded there is gone
 * the first time a rider taps the map.
 */
import type mapboxgl from 'mapbox-gl';
import { EVENT_COLOR, EVENT_DEEP_COLOR } from '@/data/race-colors';
import {
  ARROW_EDGE_METERS,
  ARROW_SPACING_METERS,
  markersAlongLine,
  midpointOf,
} from './geo-line';
import { firstTrailLabelLayerId } from './map';

export const RACE_SOURCE_ID = 'race-course-source';
export const RACE_LINE_LAYER_ID = 'race-course-line';
export const RACE_ARROWS_LAYER_ID = 'race-course-arrows';
export const RACE_ENDPOINTS_LAYER_ID = 'race-course-endpoints';
export const RACE_ENDPOINT_LABELS_LAYER_ID = 'race-course-endpoint-labels';
export const RACE_FLAG_LAYER_ID = 'race-course-flag';

export const RACE_ARROW_IMAGE = 'race-direction-arrow';
export const RACE_FLAG_IMAGE = 'race-event-flag';

/** Long, unmistakable event dashes; closures use a tighter 1:1 rhythm. */
export const RACE_LINE_DASH: [number, number] = [2.5, 1.25];

/** Zoom past which the single flag gives way to arrows and endpoints. */
const FLAG_MAX_ZOOM = 12.5;
const DETAIL_MIN_ZOOM = 11;

/** The font this style actually has glyphs for. Anything else renders nothing. */
const TEXT_FONT = ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'];

const EMPTY: GeoJSON.FeatureCollection = {
  features: [],
  type: 'FeatureCollection',
};

export interface RaceCourseOverlay {
  course: [number, number][];
  direction: 'forward' | 'reverse';
  name: string;
  originLabel: string;
  terminusLabel: string;
}

/**
 * A chevron, as raw RGBA with an alpha mask — no canvas, the same way
 * `cardImage` builds the trail name card.
 *
 * **Registered as SDF.** The existing sprites in `map.ts` are ordinary images,
 * which is exactly why `setTrailOpacity` swaps the image instead of tinting it:
 * `icon-color` does nothing on a non-SDF sprite. An arrow has to take the event
 * colour, so it has to be a mask.
 */
export function arrowImage(size = 16): {
  data: Uint8Array;
  height: number;
  width: number;
} {
  const data = new Uint8Array(size * size * 4);
  const half = size / 2;
  const thickness = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Two arms meeting at the top, pointing up — north, which is bearing 0.
      const dx = Math.abs(x - half + 0.5);
      const dy = y - size * 0.22;
      const onArm =
        dy >= 0 && Math.abs(dy - dx) <= thickness && dx <= half * 0.9;
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = onArm ? 255 : 0;
    }
  }
  return { data, height: size, width: size };
}

/** A pennant on a staff, same construction as the arrow. */
export function flagImage(size = 16): {
  data: Uint8Array;
  height: number;
  width: number;
} {
  const data = new Uint8Array(size * size * 4);
  const staffX = Math.floor(size * 0.28);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const onStaff = x >= staffX - 1 && x <= staffX && y >= size * 0.12;
      const flagHeight = size * 0.42;
      const onFlag =
        x > staffX &&
        y >= size * 0.12 &&
        y <= size * 0.12 + flagHeight &&
        x - staffX <= (1 - (y - size * 0.12) / flagHeight) * size * 0.55;
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = onStaff || onFlag ? 255 : 0;
    }
  }
  return { data, height: size, width: size };
}

/**
 * Registers whichever sprites the current style does not already have.
 *
 * Must run **before** any layer naming them: a layer pointing at an image the
 * style lacks draws no icon at all, and logs nothing. A style change drops
 * images, so the missing-image check naturally registers them again without
 * churning sprites during the provider's periodic data refresh.
 */
export function ensureRaceImages(map: mapboxgl.Map): void {
  const sprites: [
    string,
    { data: Uint8Array; height: number; width: number },
  ][] = [
    [RACE_ARROW_IMAGE, arrowImage()],
    [RACE_FLAG_IMAGE, flagImage()],
  ];
  for (const [id, image] of sprites) {
    if (!map.hasImage(id)) {
      // `sdf` is what lets `icon-color` tint these; without it they draw white.
      map.addImage(id, image, { pixelRatio: 2, sdf: true });
    }
  }
}

/**
 * The overlay as one FeatureCollection, so an update is a single `setData`.
 *
 * Exported for its test: the start/finish swap is the part worth pinning, and
 * doing it here rather than in a paint expression is what makes that possible
 * without a map.
 */
export function courseFeatures(
  overlay: RaceCourseOverlay,
): GeoJSON.FeatureCollection {
  const { course, direction, name, originLabel, terminusLabel } = overlay;
  if (course.length < 2) {
    return EMPTY;
  }

  const features: GeoJSON.Feature[] = [
    {
      geometry: { coordinates: course, type: 'LineString' },
      properties: { kind: 'course' },
      type: 'Feature',
    },
  ];

  for (const marker of markersAlongLine(
    course,
    ARROW_SPACING_METERS,
    ARROW_EDGE_METERS,
  )) {
    features.push({
      geometry: { coordinates: marker.point, type: 'Point' },
      properties: {
        // Racers running the line backwards meet every arrow reversed.
        bearing:
          direction === 'reverse'
            ? (marker.bearing + 180) % 360
            : marker.bearing,
        kind: 'arrow',
      },
      type: 'Feature',
    });
  }

  // The swap is data, not paint: the geometry's ends are fixed, and which one
  // riders start from is the only thing direction changes.
  const head = course[0];
  const tail = course[course.length - 1];
  const startPoint = direction === 'reverse' ? tail : head;
  const finishPoint = direction === 'reverse' ? head : tail;
  const startLabel = direction === 'reverse' ? terminusLabel : originLabel;
  const finishLabel = direction === 'reverse' ? originLabel : terminusLabel;

  features.push(
    {
      geometry: { coordinates: startPoint, type: 'Point' },
      properties: {
        kind: 'start',
        label: startLabel ? `Start · ${startLabel}` : 'Start',
      },
      type: 'Feature',
    },
    {
      geometry: { coordinates: finishPoint, type: 'Point' },
      properties: {
        kind: 'finish',
        label: finishLabel ? `Finish · ${finishLabel}` : 'Finish',
      },
      type: 'Feature',
    },
  );

  const midpoint = midpointOf(course);
  if (midpoint) {
    features.push({
      geometry: { coordinates: midpoint, type: 'Point' },
      properties: { kind: 'flag', label: name },
      type: 'Feature',
    });
  }

  return { features, type: 'FeatureCollection' };
}

function is(kind: string): mapboxgl.FilterSpecification {
  return ['==', ['get', 'kind'], kind];
}

function layerSpecs(): mapboxgl.LayerSpecification[] {
  return [
    {
      filter: is('course'),
      id: RACE_LINE_LAYER_ID,
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': EVENT_COLOR,
        'line-dasharray': RACE_LINE_DASH,
        'line-opacity': 0.95,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          2.5,
          14,
          4.5,
          18,
          7,
        ],
      },
      source: RACE_SOURCE_ID,
      type: 'line',
    },
    {
      filter: is('arrow'),
      id: RACE_ARROWS_LAYER_ID,
      layout: {
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-image': RACE_ARROW_IMAGE,
        'icon-rotate': ['get', 'bearing'],
        // Turns with the map, so an arrow keeps pointing down the trail.
        'icon-rotation-alignment': 'map',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.5, 15, 0.9],
      },
      minzoom: DETAIL_MIN_ZOOM,
      paint: {
        'icon-color': EVENT_DEEP_COLOR,
        'icon-halo-color': '#ffffff',
        'icon-halo-width': 1,
      },
      source: RACE_SOURCE_ID,
      type: 'symbol',
    },
    {
      filter: ['any', is('start'), is('finish')],
      id: RACE_ENDPOINTS_LAYER_ID,
      minzoom: DETAIL_MIN_ZOOM,
      paint: {
        'circle-color': [
          'case',
          ['==', ['get', 'kind'], 'start'],
          EVENT_COLOR,
          EVENT_DEEP_COLOR,
        ],
        'circle-radius': 6,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
      source: RACE_SOURCE_ID,
      type: 'circle',
    },
    {
      filter: ['any', is('start'), is('finish')],
      id: RACE_ENDPOINT_LABELS_LAYER_ID,
      layout: {
        'text-anchor': 'top',
        'text-field': ['get', 'label'],
        'text-font': TEXT_FONT,
        'text-offset': [0, 1.2],
        'text-size': 11,
      },
      minzoom: DETAIL_MIN_ZOOM,
      paint: {
        'text-color': EVENT_DEEP_COLOR,
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
      source: RACE_SOURCE_ID,
      type: 'symbol',
    },
    {
      filter: is('flag'),
      id: RACE_FLAG_LAYER_ID,
      layout: {
        'icon-allow-overlap': true,
        'icon-image': RACE_FLAG_IMAGE,
        'icon-size': 1,
        'text-anchor': 'left',
        'text-field': ['get', 'label'],
        'text-font': TEXT_FONT,
        'text-offset': [0.8, 0],
        'text-size': 12,
      },
      // Steps aside once the arrows and endpoints are legible: past this zoom
      // the course speaks for itself and the flag is one more thing to collide.
      maxzoom: FLAG_MAX_ZOOM,
      paint: {
        'icon-color': EVENT_DEEP_COLOR,
        'text-color': EVENT_DEEP_COLOR,
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
      source: RACE_SOURCE_ID,
      type: 'symbol',
    },
  ] as mapboxgl.LayerSpecification[];
}

/**
 * Draws a race course, or clears it with `null`.
 *
 * Idempotent, and **never removes its layers** — clearing is an empty
 * FeatureCollection, the same philosophy as `setClosedTrails` clearing with a
 * filter that matches nothing. Adding and removing layers on every day
 * boundary is a good way to lose one.
 *
 * The whole thing is one `try`/`catch`: a race is decoration on a working map,
 * and a missing overlay must never take the map down with it.
 */
export function setRaceCourse(
  map: mapboxgl.Map,
  overlay: RaceCourseOverlay | null,
): void {
  try {
    const data =
      overlay && overlay.course.length >= 2 ? courseFeatures(overlay) : EMPTY;

    // Before the layers, always: one naming a missing image draws nothing and
    // says nothing about it.
    ensureRaceImages(map);

    if (!map.getSource(RACE_SOURCE_ID)) {
      map.addSource(RACE_SOURCE_ID, { data: EMPTY, type: 'geojson' });
    }

    // Above the trail line, its closure dash and its transparent hit target —
    // so a racing trail is still tappable — but below the name cards, which
    // would otherwise read through a wash of gold.
    const before = firstTrailLabelLayerId(map);
    for (const spec of layerSpecs()) {
      if (!map.getLayer(spec.id)) {
        map.addLayer(spec, before);
      }
    }

    (map.getSource(RACE_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(data);
  } catch (error) {
    console.error('Failed to draw the race course overlay:', error);
  }
}
