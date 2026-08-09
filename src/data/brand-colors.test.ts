import { describe, expect, it } from 'vitest';
import { buildAppearanceCss, toChannels } from './brand-colors';

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

  it('emits nothing at all when nothing is set', () => {
    // Empty means the stylesheet defaults stand, so the map is never uncoloured.
    expect(buildAppearanceCss({})).toBe('');
    expect(buildAppearanceCss({ primaryColor: null, secondaryColor: '' })).toBe(
      '',
    );
  });

  it('drops a malformed colour rather than emitting broken CSS', () => {
    // A stray value must not be able to produce a rule that breaks the sheet.
    expect(buildAppearanceCss({ primaryColor: 'red; }' })).toBe('');
  });
});
