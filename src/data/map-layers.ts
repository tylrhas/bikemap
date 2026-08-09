/**
 * Which optional sections and layers this deployment offers, and where that
 * comes from.
 *
 * Read on the server from the Map layers global and published into this module
 * during `HomeClient`'s render, the same road the trails and the brand take.
 *
 * This is about the **switch**, not the layer's state. A rider still decides
 * whether nationwide trails are drawn; an admin decides whether they are asked.
 * A fork that only wants to show its own curated trails would otherwise have to
 * delete the toggle in code.
 *
 * Defaults are on: a deployment with no database, or one that has never opened
 * the form, keeps everything the app ships with.
 */

export interface MapLayerSettings {
  /** Offer the Casual routes section — routes, attractions, shops, rentals. */
  casualRoutes: boolean;
  /** Offer the nationwide OSM trails toggle in the Trails tab. */
  osmTrails: boolean;
  /** Offer My rides: recording, history, GPX export. */
  rides: boolean;
}

export const DEFAULT_MAP_LAYERS: MapLayerSettings = {
  casualRoutes: true,
  osmTrails: true,
  rides: true,
};

let settings: MapLayerSettings = DEFAULT_MAP_LAYERS;

export function getMapLayerSettings(): MapLayerSettings {
  return settings;
}

/**
 * Called once per page load, during render, before anything reads. Stable for
 * the life of the session, so no state and no re-render.
 */
export function setMapLayerSettings(next: MapLayerSettings): void {
  settings = next;
}
