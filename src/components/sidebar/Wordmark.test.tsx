import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { siteConfig } from '@/config/site.config';
import { setBrandIdentity } from '@/data/brand-source';
import { Wordmark } from './Wordmark';

afterEach(() => setBrandIdentity({ logoUrl: null, wordmark: null }));

describe('Wordmark', () => {
  it('falls back to the site name when nothing is saved', () => {
    // What a deployment with no database gets. The panel is never anonymous.
    render(<Wordmark />);
    expect(screen.getByText(siteConfig.shortName)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('prefers a name typed in the admin', () => {
    setBrandIdentity({ logoUrl: null, wordmark: 'COTA Trails' });
    render(<Wordmark />);
    expect(screen.getByText('COTA Trails')).toBeInTheDocument();
    expect(screen.queryByText(siteConfig.shortName)).not.toBeInTheDocument();
  });

  it('shows a logo instead of the name, not beside it', () => {
    // An org's logo carries its own symbol; two marks read as a partnership.
    setBrandIdentity({ logoUrl: '/logo.svg', wordmark: 'COTA Trails' });
    render(<Wordmark />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/logo.svg');
    expect(screen.queryByText('COTA Trails')).not.toBeInTheDocument();
  });

  it('names the logo for a screen reader', () => {
    setBrandIdentity({ logoUrl: '/logo.svg', wordmark: null });
    render(<Wordmark />);
    // No wordmark saved, so the alt text is the one name we do have.
    expect(screen.getByRole('img')).toHaveAccessibleName(siteConfig.shortName);
  });
});
