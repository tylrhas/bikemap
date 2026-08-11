/**
 * The one rule that cannot be expressed in a type: a race is not a hazard, and
 * the two never borrow each other's colour.
 *
 * Reading the source is blunt, but the alternative is a convention in a comment
 * that survives exactly until someone needs a warm colour in a hurry. If this
 * ever needs to be smarter, `eslint-rules/` is the better home.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EVENT_COLOR, EVENT_DEEP_COLOR } from './race-colors';

const ROOT = join(__dirname, '..', '..');

function source(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

/** Where a condition or closure is described. None of it may go gold. */
const CONDITION_SOURCES = [
  'src/data/condition-vocabulary.ts',
  'src/data/trail-conditions.ts',
  'src/components/sidebar/ConditionBadge.tsx',
  'src/components/sidebar/ConditionChips.tsx',
  'src/components/sidebar/TrailConditionsStrip.tsx',
];

/** The closure red and the hazard accents, which a race may not borrow. */
const HAZARD_COLORS = ['#dc2626', '#C25E3F', '#B5573B'];

describe('event colours stay out of hazard UI', () => {
  it.each(CONDITION_SOURCES)('%s names no event colour', (path) => {
    const text = source(path);
    expect(text).not.toContain(EVENT_COLOR);
    expect(text).not.toContain(EVENT_DEEP_COLOR);
    expect(text).not.toMatch(/\b(?:bg|text|ring|border|fill|stroke)-event\b/);
    expect(text).not.toMatch(/\bevent-deep\b/);
  });
});

describe('hazard colours stay out of event UI', () => {
  it('the palette gets its values from this module, not a second copy', () => {
    // Tailwind and the Mapbox paint both need these as strings; importing
    // rather than repeating is what stops the two drifting.
    const config = source('tailwind.config.ts');
    expect(config).toContain("from './src/data/race-colors'");
    expect(config).toContain('event: EVENT_COLOR');
    expect(config).toContain("'event-deep': EVENT_DEEP_COLOR");
    expect(config).not.toContain(EVENT_COLOR);
  });

  it('is a colour of its own, not one already in use', () => {
    for (const taken of HAZARD_COLORS) {
      expect(EVENT_COLOR.toLowerCase()).not.toBe(taken.toLowerCase());
      expect(EVENT_DEEP_COLOR.toLowerCase()).not.toBe(taken.toLowerCase());
    }
  });
});
