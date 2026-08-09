import { describe, expect, it } from 'vitest';
import { BASE_INSET, CHROME, computeInsets, fitInsets } from './map-insets';

const SYMMETRIC = {
  bottom: BASE_INSET,
  left: BASE_INSET,
  right: BASE_INSET,
  top: BASE_INSET,
};

describe('computeInsets', () => {
  it('is symmetric side to side, always', () => {
    // Everything that used to float over the map is a column beside it now —
    // the trail panel, and My rides with it. That is the point of the layout,
    // and it is why nothing here widens left or right.
    expect(computeInsets()).toEqual(SYMMETRIC);
    expect(computeInsets({ narrow: true })).toEqual(SYMMETRIC);
    expect(computeInsets({ elevationOpen: true }).left).toBe(BASE_INSET);
    expect(computeInsets({ elevationOpen: true }).right).toBe(BASE_INSET);
  });

  it('lifts the camera above the elevation pane', () => {
    expect(computeInsets({ elevationOpen: true }).bottom).toBe(
      BASE_INSET + CHROME.elevation,
    );
  });

  it('still lifts above the pane on a narrow screen', () => {
    // The pane covers only the bottom strip, so this one applies there too.
    expect(computeInsets({ elevationOpen: true, narrow: true }).bottom).toBe(
      BASE_INSET + CHROME.elevation,
    );
  });
});

describe('fitInsets', () => {
  it('leaves generous insets alone when there is room', () => {
    const insets = computeInsets({ elevationOpen: true });
    expect(fitInsets(insets, 1440, 900)).toEqual(insets);
  });

  it('shrinks rather than letting fitBounds fail', () => {
    // Mapbox throws when padding leaves nothing to draw into, and an
    // off-centre trail beats no camera move at all.
    const fitted = fitInsets(computeInsets({ elevationOpen: true }), 700, 260);
    expect(fitted.top + fitted.bottom).toBeLessThanOrEqual(260 * 0.75);
    expect(fitted.top).toBeGreaterThan(0);
    expect(fitted.bottom).toBeGreaterThan(0);
  });

  it('keeps the larger side larger when it shrinks', () => {
    const fitted = fitInsets(computeInsets({ elevationOpen: true }), 400, 200);
    expect(fitted.bottom).toBeGreaterThan(fitted.top);
  });

  it('survives a zero-sized canvas', () => {
    expect(() => fitInsets(computeInsets(), 0, 0)).not.toThrow();
  });
});
