/**
 * The wordmark and logo the header draws, and where they come from.
 *
 * The colors and fonts reach the page as CSS, injected by the layout — but a
 * name and an image URL are content, not style, and the header is a client
 * component several levels down. So they travel the same road the trails do:
 * read on the server, published into this module during `HomeClient`'s render,
 * before anything reads them.
 *
 * Blank at every level means "use `site.config.ts`", which is what a deployment
 * with no database gets.
 */
import type { BrandIdentity } from './brand';

let identity: BrandIdentity = { logoUrl: null, wordmark: null };

export function getBrandIdentity(): BrandIdentity {
  return identity;
}

/**
 * Called once per page load, during render. The value is stable for the life of
 * the session, so no state and no re-render.
 */
export function setBrandIdentity(next: BrandIdentity): void {
  identity = next;
}
