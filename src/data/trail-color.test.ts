import { describe, expect, it } from 'vitest';
import { onDarkSurface } from './trail-color';

/** WCAG relative luminance, so the assertions are about what you can see. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const h = hex.replace('#', '');
    const c = [0, 2, 4]
      .map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255)
      .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `forest-lift`, the tile a sparkline is drawn on. */
const PANEL = '#144237';

describe('onDarkSurface', () => {
  it('rescues the colours that were invisible', () => {
    // Advanced measured 1.09:1 against the tile, which is not a faint
    // sparkline — it is no sparkline. This is the Lone Wolf bug.
    expect(contrast('#374151', PANEL)).toBeLessThan(1.2);
    expect(contrast(onDarkSurface('#374151'), PANEL)).toBeGreaterThan(3);
  });

  it('clears 3:1 for every colour the app ships', () => {
    for (const color of [
      '#16A34A', // easy
      '#2563EB', // intermediate
      '#374151', // advanced
      '#000000', // expert
      '#6B7280', // unrated
      '#059669', // greenway
    ]) {
      expect(
        contrast(onDarkSurface(color), PANEL),
        `${color} on the panel`,
      ).toBeGreaterThan(3);
    }
  });

  it('keeps the hue, so a green trail still reads green', () => {
    // Substituting one legible colour would lose what the sparkline says about
    // the grade. Lifting lightness keeps it.
    const green = onDarkSurface('#16A34A');
    const [r, g, b] = [1, 3, 5].map((i) =>
      Number.parseInt(green.slice(i, i + 2), 16),
    );
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it('keeps black grey rather than letting it drift to a hue', () => {
    const lifted = onDarkSurface('#000000');
    const [r, g, b] = [1, 3, 5].map((i) =>
      Number.parseInt(lifted.slice(i, i + 2), 16),
    );
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it('leaves a colour that is already light alone', () => {
    // The map's colours are picked for a light background; only the ones that
    // fail on the panel are touched.
    expect(onDarkSurface('#FCA793')).toBe('#FCA793');
    expect(onDarkSurface('#FFFFFF')).toBe('#FFFFFF');
  });

  it('passes anything that is not a hex straight through', () => {
    // A curator can type a named colour on a rating row, and a sparkline in the
    // wrong colour beats one that throws.
    expect(onDarkSurface('rebeccapurple')).toBe('rebeccapurple');
    expect(onDarkSurface('')).toBe('');
  });
});
