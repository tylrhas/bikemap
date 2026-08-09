/**
 * Turning saved brand colours into the CSS the map is painted with.
 *
 * Pure, and free of Payload imports, so the rules are testable without a
 * database — the same split `read/appearance.ts` uses. The fetching half lives
 * in `payload/read/map-appearance.ts`, which is server-only.
 *
 * Channels rather than hex is the load-bearing detail: Tailwind needs
 * `rgb(var(--app-primary) / <alpha-value>)` for opacity modifiers to work, and
 * `ring-app-primary/30` is in use.
 */

const HEX = /^#[0-9a-f]{6}$/i;

export interface BrandColors {
  primaryColor?: null | string;
  secondaryColor?: null | string;
}

/** `#c3f44d` -> `195 244 77`. Null for anything that isn't a 6-digit hex. */
export function toChannels(hex: null | string | undefined): null | string {
  if (!hex || !HEX.test(hex)) {
    return null;
  }
  const n = Number.parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/**
 * A `:root` block for whatever was set, or an empty string.
 *
 * Empty matters: it means the defaults in `globals.css` stand, so a deployment
 * that never opens the form — or one with no database — is fully coloured.
 */
export function buildAppearanceCss(colors: BrandColors): string {
  const declarations: string[] = [];

  const primary = toChannels(colors.primaryColor);
  if (primary) {
    declarations.push(`--app-primary:${primary}`);
  }
  const secondary = toChannels(colors.secondaryColor);
  if (secondary) {
    declarations.push(`--app-secondary:${secondary}`);
  }

  return declarations.length > 0 ? `:root{${declarations.join(';')}}` : '';
}
