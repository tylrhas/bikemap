/**
 * Making a trail's colour readable on the dark panel.
 *
 * Trail colours are chosen to draw lines over a light map, so several of them
 * are nearly black: "advanced" is `#374151` and "expert" is `#000000`. Used raw
 * on the panel's tile they disappear — advanced measures 1.09:1 against
 * `#144237`, which is not a faint sparkline, it is no sparkline. That is why
 * Lone Wolf looked like it had no elevation chart while its data was perfect.
 *
 * Lifting lightness rather than substituting a fixed colour keeps the hue, so a
 * green trail still reads green and the sparkline still says something about
 * the grade. Saturation is kept too, which is what stops black going blue.
 *
 * The map is left alone: there the colours sit on satellite and terrain, which
 * is what they were picked for.
 *
 * Client-safe, pure, no Node imports.
 */

/**
 * The lightness a colour is raised to when it is too dark for the panel.
 *
 * 62% clears 3:1 against `forest-lift` for every colour in the shipped
 * vocabulary while staying dark enough not to glare.
 */
export const DARK_SURFACE_MIN_LIGHTNESS = 62;

const HEX = /^#([0-9a-f]{6})$/i;

function toHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}

function hueToRgb(p: number, q: number, t: number): number {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}

function toHex(h: number, s: number, l: number): string {
  if (s === 0) {
    const v = Math.round(l * 255);
    return `#${[v, v, v].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const rgb = [
    hueToRgb(p, q, h + 1 / 3),
    hueToRgb(p, q, h),
    hueToRgb(p, q, h - 1 / 3),
  ];
  return `#${rgb
    .map((n) =>
      Math.round(n * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/**
 * The colour to draw with on the panel: the trail's own, unless it is too dark
 * to see there, in which case the same hue raised until it is.
 *
 * Anything that isn't a 6-digit hex comes back untouched — a curator can put a
 * named colour on a rating row, and a sparkline in the wrong colour beats one
 * that throws.
 */
export function onDarkSurface(
  color: string,
  minLightness = DARK_SURFACE_MIN_LIGHTNESS,
): string {
  const match = HEX.exec(color);
  if (!match) {
    return color;
  }
  const n = Number.parseInt(match[1], 16);
  const [h, s, l] = toHsl(
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255,
  );
  const target = minLightness / 100;
  return l >= target ? color : toHex(h, s, target);
}
