import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_MAP_LAYERS,
  getMapLayerSettings,
  setMapLayerSettings,
} from './map-layers';

afterEach(() => setMapLayerSettings(DEFAULT_MAP_LAYERS));

describe('map layer settings', () => {
  it('offers everything until told otherwise', () => {
    // No database, or a global nobody has opened, must not cost the map a
    // layer — so the shipped default is on.
    expect(getMapLayerSettings()).toEqual({ osmTrails: true });
  });

  it('takes what the server published', () => {
    setMapLayerSettings({ osmTrails: false });
    expect(getMapLayerSettings().osmTrails).toBe(false);
  });
});
