/**
 * The two colours a race is drawn in.
 *
 * Literal hexes with no CSS variable and no admin field, like `good`, `warn`
 * and `advanced` — and for the same reason. A deployment recolouring its brand
 * should not recolour a race: gold means "event" the way red means "closed",
 * and neither is the org's choice to make. `MapAppearance` puts it plainly —
 * only colours something reads belong on the form.
 *
 * Deliberately not `clay`, which already carries elevation lines, selection and
 * the dock accent. Keeping them apart is what lets one row show a race and a
 * rating without the two competing.
 *
 * `tailwind.config.ts` imports these, so the palette and the Mapbox paint below
 * cannot drift apart. Nothing else may define them.
 */

/** Badges, the dashed map line, and the dock's tinted strip. */
export const EVENT_COLOR = '#D9A441';

/**
 * The same colour taken down for text and icons on a light surface — the gold
 * itself manages about 2:1 on cream, which is not a faint label but no label.
 */
export const EVENT_DEEP_COLOR = '#8A6423';
