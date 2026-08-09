import { describe, expect, it } from 'vitest';
import { BASE_INSET, CHROME, computeInsets, fitInsets } from './map-insets';

describe('computeInsets', () => {
  it('always clears the rail on desktop, even with the list collapsed', () => {
    // The rail never goes away, so there is no desktop state where the left
    // edge of the map is the left edge of the window.
    expect(computeInsets()).toEqual({
      bottom: BASE_INSET,
      left: BASE_INSET + CHROME.rail,
      right: BASE_INSET,
      top: BASE_INSET,
    });
  });

  it('is symmetric on a phone, which has no rail', () => {
    expect(computeInsets({ narrow: true })).toEqual({
      bottom: BASE_INSET,
      left: BASE_INSET,
      right: BASE_INSET,
      top: BASE_INSET,
    });
  });

  it('pushes the camera clear of an open sidebar', () => {
    // The bug this exists for: without it a trail centres in the whole window,
    // which is behind the sidebar.
    const insets = computeInsets({ sidebarOpen: true });
    expect(insets.left).toBe(BASE_INSET + CHROME.sidebar);
    expect(insets.right).toBe(BASE_INSET);
  });

  it('accounts for both side panels at once', () => {
    const insets = computeInsets({ ridesPanelOpen: true, sidebarOpen: true });
    expect(insets.left).toBe(BASE_INSET + CHROME.sidebar);
    expect(insets.right).toBe(BASE_INSET + CHROME.ridesPanel);
  });

  it('lifts the camera above the elevation pane', () => {
    expect(computeInsets({ elevationOpen: true }).bottom).toBe(
      BASE_INSET + CHROME.elevation,
    );
  });

  it('widens from rail to full panel when the list opens', () => {
    expect(computeInsets({ sidebarOpen: false }).left).toBe(
      BASE_INSET + CHROME.rail,
    );
    expect(computeInsets({ sidebarOpen: true }).left).toBe(
      BASE_INSET + CHROME.sidebar,
    );
  });

  it('ignores side panels on a narrow screen', () => {
    // There they cover the map entirely, so there is no visible region to aim
    // at — squeezing into a sliver would be worse than centring.
    const insets = computeInsets({
      narrow: true,
      ridesPanelOpen: true,
      sidebarOpen: true,
    });
    expect(insets.left).toBe(BASE_INSET);
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
    const insets = computeInsets({ sidebarOpen: true });
    expect(fitInsets(insets, 1440, 900)).toEqual(insets);
  });

  it('shrinks rather than letting fitBounds fail', () => {
    // Two panels on a small window ask for more padding than exists; Mapbox
    // throws on that, and an off-centre trail beats no camera move.
    const insets = computeInsets({ ridesPanelOpen: true, sidebarOpen: true });
    const fitted = fitInsets(insets, 700, 500);
    expect(fitted.left + fitted.right).toBeLessThanOrEqual(700 * 0.75);
    expect(fitted.left).toBeGreaterThan(0);
    expect(fitted.right).toBeGreaterThan(0);
  });

  it('keeps the larger side larger when it shrinks', () => {
    const fitted = fitInsets(computeInsets({ sidebarOpen: true }), 400, 400);
    expect(fitted.left).toBeGreaterThan(fitted.right);
  });

  it('survives a zero-sized canvas', () => {
    expect(() => fitInsets(computeInsets(), 0, 0)).not.toThrow();
  });
});
