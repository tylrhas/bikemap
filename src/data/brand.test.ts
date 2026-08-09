import { describe, expect, it } from 'vitest';
import {
  brandIdentity,
  buildAppearanceCss,
  safeUrl,
  sanitizeFontStack,
  toChannels,
} from './brand';

describe('toChannels', () => {
  it('converts hex to the space-separated channels Tailwind needs', () => {
    // The format is what keeps `ring-app-primary/30` working — a hex value
    // cannot carry an alpha modifier.
    expect(toChannels('#c3f44d')).toBe('195 244 77');
    expect(toChannels('#1a434e')).toBe('26 67 78');
  });

  it('handles the extremes without dropping a channel', () => {
    expect(toChannels('#000000')).toBe('0 0 0');
    expect(toChannels('#ffffff')).toBe('255 255 255');
    expect(toChannels('#0000ff')).toBe('0 0 255');
  });

  it('is case insensitive', () => {
    expect(toChannels('#C3F44D')).toBe(toChannels('#c3f44d'));
  });

  it('rejects anything that is not a six-digit hex', () => {
    for (const bad of ['', '#fff', 'c3f44d', 'red', '#12345', '#1234567']) {
      expect(toChannels(bad)).toBeNull();
    }
    expect(toChannels(null)).toBeNull();
    expect(toChannels(undefined)).toBeNull();
  });
});

describe('sanitizeFontStack', () => {
  it('keeps an ordinary stack, quotes and all', () => {
    expect(sanitizeFontStack('"Söhne Breit", Helvetica, sans-serif')).toBe(
      '"Söhne Breit", Helvetica, sans-serif',
    );
    expect(sanitizeFontStack("  'Public Sans', system-ui  ")).toBe(
      "'Public Sans', system-ui",
    );
  });

  it('rejects anything that could end the declaration or open a rule', () => {
    // The value is interpolated into a stylesheet, so the shape is the defence.
    for (const bad of [
      'Inter; color: red',
      'Inter} body{display:none',
      'url(https://evil.example/x)',
      'Inter/**/',
    ]) {
      expect(sanitizeFontStack(bad)).toBeNull();
    }
  });

  it('rejects a stack long enough to be something other than a stack', () => {
    expect(sanitizeFontStack('a'.repeat(201))).toBeNull();
  });

  it('treats blank as unset', () => {
    expect(sanitizeFontStack('   ')).toBeNull();
    expect(sanitizeFontStack(null)).toBeNull();
    expect(sanitizeFontStack(undefined)).toBeNull();
  });
});

describe('safeUrl', () => {
  it('allows http(s) and site-relative paths', () => {
    expect(safeUrl('https://cdn.example/logo.svg')).toBe(
      'https://cdn.example/logo.svg',
    );
    expect(safeUrl('http://localhost:3000/logo.png')).toBe(
      'http://localhost:3000/logo.png',
    );
    // Dropping a file in `public/` is the simplest thing that works.
    expect(safeUrl('/brand/logo.svg')).toBe('/brand/logo.svg');
  });

  it('rejects schemes that would execute or inline', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,<script>')).toBeNull();
  });

  it('rejects a protocol-relative URL, which reads like a path', () => {
    // `//evil.example/logo.svg` looks site-relative and is not.
    expect(safeUrl('//evil.example/logo.svg')).toBeNull();
  });

  it('rejects something that is not a URL at all', () => {
    expect(safeUrl('logo.svg')).toBeNull();
    expect(safeUrl('  ')).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });
});

describe('buildAppearanceCss', () => {
  it('emits only what was set', () => {
    expect(buildAppearanceCss({ primaryColor: '#c3f44d' })).toBe(
      ':root{--app-primary:195 244 77}',
    );
    expect(
      buildAppearanceCss({
        primaryColor: '#c3f44d',
        secondaryColor: '#1a434e',
      }),
    ).toBe(':root{--app-primary:195 244 77;--app-secondary:26 67 78}');
  });

  it('covers the whole visible brand, in a stable order', () => {
    expect(
      buildAppearanceCss({
        accentColor: '#fca793',
        bodyFont: 'Inter, sans-serif',
        displayFont: '"Fraunces", serif',
        inkColor: '#14231d',
        primaryColor: '#bd815a',
        secondaryColor: '#023428',
        surfaceColor: '#f5efe6',
      }),
    ).toBe(
      ':root{--app-primary:189 129 90;--app-secondary:2 52 40;' +
        '--app-surface:245 239 230;--app-ink:20 35 29;--app-accent:252 167 147;' +
        '--app-font-display:"Fraunces", serif;--app-font-body:Inter, sans-serif}',
    );
  });

  it('emits nothing at all when nothing is set', () => {
    // Empty means the stylesheet defaults stand, so the map is never unbranded.
    expect(buildAppearanceCss({})).toBe('');
    expect(buildAppearanceCss({ primaryColor: null, secondaryColor: '' })).toBe(
      '',
    );
  });

  it('drops a malformed value without losing the good ones', () => {
    // A stray value must not be able to produce a rule that breaks the sheet,
    // nor take the rest of the brand down with it.
    expect(buildAppearanceCss({ primaryColor: 'red; }' })).toBe('');
    expect(
      buildAppearanceCss({
        displayFont: 'Inter; color: red',
        primaryColor: '#c3f44d',
      }),
    ).toBe(':root{--app-primary:195 244 77}');
  });
});

describe('brandIdentity', () => {
  it('passes through a wordmark and a usable logo', () => {
    expect(
      brandIdentity({ logoUrl: '/logo.svg', wordmark: '  COTA Trails  ' }),
    ).toEqual({ logoUrl: '/logo.svg', wordmark: 'COTA Trails' });
  });

  it('is null for each half that is unset or unusable', () => {
    // Null is what tells the header to fall back to the site name.
    expect(brandIdentity({})).toEqual({ logoUrl: null, wordmark: null });
    expect(
      brandIdentity({ logoUrl: 'javascript:alert(1)', wordmark: '   ' }),
    ).toEqual({ logoUrl: null, wordmark: null });
  });
});
