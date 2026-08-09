import { describe, expect, it } from 'vitest';
import {
  clampSnap,
  dragFraction,
  FULL,
  HALF,
  nearestSnap,
  PEEK,
  SNAP_FRACTIONS,
} from './sheet-snap';

describe('clampSnap', () => {
  it('keeps a real stop', () => {
    expect(clampSnap(PEEK)).toBe(PEEK);
    expect(clampSnap(FULL)).toBe(FULL);
  });

  it('pulls anything out of range back to a stop', () => {
    // A bad index must never leave the sheet parked off-screen.
    expect(clampSnap(-3)).toBe(PEEK);
    expect(clampSnap(99)).toBe(FULL);
  });

  it('falls back to half rather than propagating nonsense', () => {
    expect(clampSnap(Number.NaN)).toBe(HALF);
  });
});

describe('nearestSnap', () => {
  it('resolves a resting position to its own stop', () => {
    SNAP_FRACTIONS.forEach((fraction, i) => {
      expect(nearestSnap(fraction)).toBe(i);
    });
  });

  it('returns the sheet where it was after a small nudge', () => {
    // An accidental few pixels should not change the stop.
    expect(nearestSnap(SNAP_FRACTIONS[HALF] + 0.03)).toBe(HALF);
    expect(nearestSnap(SNAP_FRACTIONS[HALF] - 0.03)).toBe(HALF);
  });

  it('changes stop once the drag passes the midpoint', () => {
    const mid = (SNAP_FRACTIONS[HALF] + SNAP_FRACTIONS[FULL]) / 2;
    expect(nearestSnap(mid - 0.02)).toBe(FULL);
    expect(nearestSnap(mid + 0.02)).toBe(HALF);
  });
});

describe('dragFraction', () => {
  const height = 600;

  it('follows the finger', () => {
    // Dragging down hides more of the sheet.
    expect(dragFraction(0, 60, height)).toBeCloseTo(0.1, 5);
    expect(dragFraction(0.5, -60, height)).toBeCloseTo(0.4, 5);
  });

  it('cannot be dragged past the stops in either direction', () => {
    // Nothing exists beyond them to reveal, so rubber-banding would only have
    // to be animated back.
    expect(dragFraction(0, -9999, height)).toBe(SNAP_FRACTIONS[FULL]);
    expect(dragFraction(0.8, 9999, height)).toBe(SNAP_FRACTIONS[PEEK]);
  });

  it('stays put when the sheet has no height yet', () => {
    expect(dragFraction(0.45, 200, 0)).toBe(0.45);
  });
});
