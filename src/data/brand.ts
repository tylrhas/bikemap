/**
 * Turning a saved brand into the CSS and the identity the map is dressed with.
 *
 * Pure, and free of Payload imports, so the rules are testable without a
 * database — the same split `read/appearance.ts` uses. The fetching half lives
 * in `payload/read/map-appearance.ts`, which is server-only.
 *
 * Everything here is defensive on purpose. Colours become a `:root` block, font
 * names land in a `font-family`, and URLs land in an `href`/`src`; all three are
 * places where a bad value from a text field would otherwise become markup. The
 * rule is the same in each case: recognise the shape we expect, or drop it.
 *
 * Channels rather than hex is the load-bearing detail for colour: Tailwind needs
 * `rgb(var(--app-primary) / <alpha-value>)` for opacity modifiers to work, and
 * `ring-app-primary/30` is in use.
 */

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * What a CSS font stack may contain: names, quotes, commas, spaces, hyphens.
 *
 * Deliberately narrower than CSS allows — no parentheses, semicolons or braces
 * — because the value is interpolated into a stylesheet. A name that needs
 * anything else isn't worth the hole.
 */
const FONT_STACK = /^[\p{L}\p{N}\s,'"_-]+$/u;
const FONT_STACK_MAX = 200;

export interface Brand {
  accentColor?: null | string;
  /** CSS stack for running text. Blank keeps the bundled body font. */
  bodyFont?: null | string;
  /** CSS stack for trail names and headings. Blank keeps the bundled one. */
  displayFont?: null | string;
  /** Stylesheet defining the fonts above — Google Fonts, Fontshare, your own. */
  fontUrl?: null | string;
  inkColor?: null | string;
  /** Shown instead of the wordmark. */
  logoUrl?: null | string;
  primaryColor?: null | string;
  secondaryColor?: null | string;
  surfaceColor?: null | string;
  /** Replaces the site name beside the logo. */
  wordmark?: null | string;
}

/** What the client needs to draw the header. */
export interface BrandIdentity {
  logoUrl: null | string;
  wordmark: null | string;
}

/** Field to CSS variable. Only colours something actually reads appear here. */
const COLOR_VARIABLES: [keyof Brand, string][] = [
  ['primaryColor', '--app-primary'],
  ['secondaryColor', '--app-secondary'],
  ['surfaceColor', '--app-surface'],
  ['inkColor', '--app-ink'],
  ['accentColor', '--app-accent'],
];

const FONT_VARIABLES: [keyof Brand, string][] = [
  ['displayFont', '--app-font-display'],
  ['bodyFont', '--app-font-body'],
];

/** `#c3f44d` -> `195 244 77`. Null for anything that isn't a 6-digit hex. */
export function toChannels(hex: null | string | undefined): null | string {
  if (!hex || !HEX.test(hex)) {
    return null;
  }
  const n = Number.parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** A font stack we're willing to put in a stylesheet, or null. */
export function sanitizeFontStack(
  value: null | string | undefined,
): null | string {
  const stack = value?.trim();
  if (!stack || stack.length > FONT_STACK_MAX || !FONT_STACK.test(stack)) {
    return null;
  }
  return stack;
}

/**
 * A URL we're willing to put in an `href` or `src`, or null.
 *
 * Site-relative paths are allowed because dropping a logo in `public/` is the
 * simplest thing that works, and `//host` is not — it reads like a path and
 * loads from somewhere else. Everything else must be explicit http(s), which
 * is what rules out `javascript:` and `data:`.
 */
export function safeUrl(value: null | string | undefined): null | string {
  const url = value?.trim();
  if (!url) {
    return null;
  }
  if (url.startsWith('/')) {
    return url.startsWith('//') ? null : url;
  }
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * A `:root` block for whatever was set, or an empty string.
 *
 * Empty matters: it means the defaults in `globals.css` stand, so a deployment
 * that never opens the form — or one with no database — is fully branded, and
 * clearing a field is how a curator resets it.
 */
export function buildAppearanceCss(brand: Brand): string {
  const declarations: string[] = [];

  for (const [field, variable] of COLOR_VARIABLES) {
    const channels = toChannels(brand[field]);
    if (channels) {
      declarations.push(`${variable}:${channels}`);
    }
  }

  for (const [field, variable] of FONT_VARIABLES) {
    const stack = sanitizeFontStack(brand[field]);
    if (stack) {
      declarations.push(`${variable}:${stack}`);
    }
  }

  return declarations.length > 0 ? `:root{${declarations.join(';')}}` : '';
}

/** The header's logo and wordmark, both null unless set and usable. */
export function brandIdentity(brand: Brand): BrandIdentity {
  return {
    logoUrl: safeUrl(brand.logoUrl),
    wordmark: brand.wordmark?.trim() || null,
  };
}
