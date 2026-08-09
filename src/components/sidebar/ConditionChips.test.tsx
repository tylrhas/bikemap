import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ConditionChips } from './ConditionChips';
import type { ConditionReport } from '@/data/trail-conditions';
import { MAP_EVENTS } from '@/events';

const latest: Record<string, ConditionReport> = {};

vi.mock('@/components/TrailConditionsProvider', () => ({
  useTrailConditions: () => ({
    latest,
    loading: false,
    lockedReason: () => null,
    options: [],
    recordLocal: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/data/trail-source', () => ({
  getMountainBikeTrails: () => [
    {
      color: '#374151',
      displayName: 'Pondo',
      rating: 'advanced',
      recArea: 'Bend',
      slug: 'pondo',
      trailName: 'Pondo',
    },
  ],
}));

function setViewport(narrow: boolean) {
  window.matchMedia = ((q: string) => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: narrow,
    media: q,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

function report(
  daysAgo: number,
  over: Partial<ConditionReport> = {},
): ConditionReport {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    color: '#16a34a',
    marksClosed: false,
    name: 'Dry',
    observedAt: d.toISOString(),
    source: 'public',
    value: 'dry',
    ...over,
  };
}

const select = (trailName = 'Pondo') =>
  act(() => {
    window.dispatchEvent(
      new CustomEvent(MAP_EVENTS.TRAIL_SELECT, { detail: { trailName } }),
    );
  });

describe('ConditionChips', () => {
  beforeEach(() => {
    setViewport(false);
    for (const k of Object.keys(latest)) delete latest[k];
  });

  it('shows nothing until a trail is selected', () => {
    render(<ConditionChips />);
    expect(screen.queryByText('Condition')).not.toBeInTheDocument();
  });

  it('names the current condition and who said it', () => {
    latest.pondo = report(2, { name: 'Prime / tacky', source: 'admin' });
    render(<ConditionChips />);
    select();

    expect(screen.getByText('Prime / tacky')).toBeInTheDocument();
    // A steward's word is marked differently from a rider's guess.
    expect(screen.getByText('Steward')).toBeInTheDocument();
  });

  it('says a trail has nothing reported rather than showing nothing', () => {
    // An empty row is indistinguishable from the feature being broken.
    render(<ConditionChips />);
    select();
    expect(screen.getByText('Not reported yet')).toBeInTheDocument();
  });

  it('calls a stale report out of date instead of presenting it as current', () => {
    latest.pondo = report(200);
    render(<ConditionChips />);
    select();
    expect(screen.getByText('Out of date')).toBeInTheDocument();
    expect(screen.queryByText('Dry')).not.toBeInTheDocument();
  });

  it('shows nothing for an OSM way or a ride, which have no conditions', () => {
    render(<ConditionChips />);
    select('Some OSM Way');
    expect(screen.queryByText('Conditions')).not.toBeInTheDocument();
  });

  it('stays off a phone, where the sheet already lists conditions', () => {
    setViewport(true);
    latest.pondo = report(1);
    render(<ConditionChips />);
    select();
    expect(screen.queryByText('Condition')).not.toBeInTheDocument();
  });
});
