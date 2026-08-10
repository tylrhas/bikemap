'use client';

/**
 * Who this map belongs to, at the top of the trail panel.
 *
 * Three sources, most specific first: a logo image, a name typed in the admin,
 * then the name in `site.config.ts`. The last is what a deployment with no
 * database gets, so the panel is never anonymous.
 *
 * A logo replaces the bicycle mark as well as the name — an org's logo almost
 * always carries its own symbol, and two marks side by side reads as a
 * partnership.
 */
import { faBicycle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { siteConfig } from '@/config/site.config';
import { getBrandIdentity } from '@/data/brand-source';
import { cn } from '@/lib/utils';

export function Wordmark({ className }: { className?: string }) {
  const { logoUrl, wordmark } = getBrandIdentity();
  const name = wordmark ?? siteConfig.shortName;

  if (logoUrl) {
    // A plain <img>, not next/image: the URL is typed into the admin, so the
    // host isn't known at build time and can't be listed in
    // `images.remotePatterns`. Both linters want to be told, and they want to
    // be told differently — a block disable because eslint's directive would
    // otherwise land on biome's comment rather than the element.
    /* eslint-disable @next/next/no-img-element */
    return (
      // biome-ignore lint/performance/noImgElement: host unknown until runtime
      <img
        alt={name}
        className={cn('h-6 w-auto max-w-[220px] object-contain', className)}
        src={logoUrl}
      />
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* White, which is what COTA puts on its dark sections. The accent is a
          deep green — 1.9:1 against this panel, so it would barely be there. */}
      <FontAwesomeIcon
        className="w-[17px] h-[17px] text-cream"
        icon={faBicycle}
      />
      <span className="text-cream text-ui font-bold uppercase tracking-[0.12em]">
        {name}
      </span>
    </div>
  );
}
