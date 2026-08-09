import { describe, expect, it } from 'vitest';
import { BASE_INSET, CHROME, computeInsets, fitInsets } from './map-insets';

describe('computeInsets', () => {
  it('is symmetric with nothing floating over the map', () => {
    // The trail panel is a column beside the map, so it never needs clearing —
    // that is the whole point of the layout.
    const symmetric = {
      bottom: BASE_INSET,
      left: BASE_INSET,
      right: BASE_INSET,
      top: BASE_INSET,
    };
    expect(computeInsets()).toEqual(symmetric);
    expect(computeInsets({ narrow: true })).toEqual(symmetric);
  });

  it('clears the rides panel, which does still float over the map', () => {
    const insets = computeInsets({ ridesPanelOpen: true });
    expect(insets.right).toBe(BASE_INSET + CHROME.ridesPanel);
    expect(insets.left).toBe(BASE_INSET);
  });

  it('lifts the camera above the elevation pane', () => {
    expect(computeInsets({ elevationOpen: true }).bottom).toBe(
      BASE_INSET + CHROME.elevation,
    );
  });

  it('ignores the rides panel on a narrow screen', () => {
    // There it covers the map entirely, so there is no visible region to aim
    // at — squeezing into a sliver would be worse than centring.
    const insets = computeInsets({ narrow: true, ridesPanelOpen: true });
    expect(insets.right).toBe(BASE_INSET);
  });

  it('still lifts above the pane on a narrow screen', () => {
    // The pane covers only the bottom strip, so this one still applies.
    expect(computeInsets({ elevationOpen: true, narrow: true }).bottom).toBe(
      BASE_INSET + CHROME.elevation,
    );
  });
});

describe('fitInsets', () => {
  it('leaves generous insets alone when there is room', () => {
    const insets = computeInsets({ ridesPanelOpen: true });
    expect(fitInsets(insets, 1440, 900)).toEqual(insets);
  });

  it('shrinks rather than letting fitBounds fail', () => {
    // Two panels on a small window ask for more padding than exists; Mapbox
    // throws on that, and an off-centre trail beats no camera move.
    const insets = computeInsets({ elevationOpen: true, ridesPanelOpen: true });
    const fitted = fitInsets(insets, 700, 500);
    expect(fitted.left + fitted.right).toBeLessThanOrEqual(700 * 0.75);
    expect(fitted.left).toBeGreaterThan(0);
    expect(fitted.right).toBeGreaterThan(0);
  });

  it('keeps the larger side larger when it shrinks', () => {
    const fitted = fitInsets(computeInsets({ ridesPanelOpen: true }), 400, 400);
    expect(fitted.right).toBeGreaterThan(fitted.left);
  });

  it('survives a zero-sized canvas', () => {
    expect(() => fitInsets(computeInsets(), 0, 0)).not.toThrow();
  });
});
