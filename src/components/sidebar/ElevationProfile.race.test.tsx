/**
 * The race surfaces on the elevation pane, and the guard that they reuse the
 * hover the chart already had rather than inventing a second one.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAP_EVENTS } from '@/events';

const ROOT = join(__dirname, '..', '..', '..');

function source(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

describe('the hover mechanism was reused, not forked', () => {
  it('adds no race event to the registry', () => {
    // The mile lives in `hoverIndex`, which is local state read by the same
    // component that renders the readout. Anything needing a new window event
    // here means a second mechanism was built alongside the first.
    const names = Object.keys(MAP_EVENTS);
    expect(names.filter((n) => /RACE|EVENT_/.test(n))).toEqual([]);
  });

  it('still dispatches exactly lng and lat on hover', () => {
    // The only listener is the map's hover marker. Widening this detail is the
    // sanctioned extension if something outside the pane ever needs the mile —
    // but nothing does today, and it should not grow by accident.
    const text = source('src/components/sidebar/ElevationProfile.tsx');
    const dispatches = text.match(
      /MAP_EVENTS\.ELEVATION_HOVER[\s\S]{0,140}?detail:\s*\{([^}]*)\}/g,
    );
    expect(dispatches).not.toBeNull();
    for (const dispatch of dispatches ?? []) {
      expect(dispatch).toMatch(/lng/);
      expect(dispatch).toMatch(/lat/);
      expect(dispatch).not.toMatch(/mile|index|trailName/);
    }
  });

  it('drives the race readout off the existing hoverIndex', () => {
    const text = source('src/components/sidebar/ElevationProfile.tsx');
    // Both surfaces reuse one readout, which computes the mile from the same
    // hover index as the mi/ft figure.
    expect(text.match(/<ElevationReadout/g)).toHaveLength(2);
    expect(
      text.match(/const mile = points\[hoverIndex\]\[0\] \/ 5280/g),
    ).toHaveLength(1);
    // Exactly one place computes a hover position — everything else clears it.
    // A second would mean the race grew its own scrub.
    expect(text.match(/setHoverIndex\((?!null)/g)).toHaveLength(1);
  });

  it('gives the race components no hover state of their own', () => {
    for (const file of [
      'src/components/sidebar/EventEtaReadout.tsx',
      'src/components/sidebar/CheckpointMarkers.tsx',
    ]) {
      const text = source(file);
      expect(text).not.toMatch(/useState|useEffect|addEventListener/);
    }
  });

  it('gives the dock a readout row of its own', () => {
    // It never had one — the floating card kept the only one — and the dock is
    // exactly where a race matters most.
    const text = source('src/components/sidebar/ElevationProfile.tsx');
    expect(
      text.match(/text-meta text-ink\/65 text-center py-0\.5 min-h-4/g),
    ).toHaveLength(1);
    expect(text.match(/<ElevationReadout/g)).toHaveLength(2);
  });
});

describe('the pane keeps the event and hazard palettes apart', () => {
  it('names no event colour in the conditions strip', () => {
    const text = source('src/components/sidebar/TrailConditionsStrip.tsx');
    expect(text).not.toMatch(/\bevent\b/);
  });

  it('names no closure red in the race components', () => {
    for (const file of [
      'src/components/sidebar/EventBanner.tsx',
      'src/components/sidebar/EventTag.tsx',
      'src/components/sidebar/EventEtaReadout.tsx',
      'src/components/sidebar/CheckpointMarkers.tsx',
      'src/components/sidebar/EventSpreadSummary.tsx',
    ]) {
      const text = source(file);
      expect(text).not.toContain('#dc2626');
      expect(text).not.toMatch(/\b(?:bg|text|ring|border)-(?:warn|coral)\b/);
    }
  });
});
