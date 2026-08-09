import type { GlobalConfig } from 'payload';
import { slugValidator } from '@/payload/collections/vocabulary-fields';

/**
 * The public map's palette, editable at `/admin/globals/map-appearance`.
 *
 * Separate from the `theme` global, which dresses the admin. A curator changing
 * how riders see the map and an admin changing how their own tools look are
 * different decisions, and one form for both makes each confusing.
 *
 * Only colours something actually reads are here. Trail and condition colours
 * are already curated under Lists, and a control that changes nothing is worse
 * than no control — so the palette's unused members are deliberately absent.
 *
 * Every field is optional: blank means the default in `globals.css`, so a
 * deployment that never opens this form is fully coloured, and clearing a field
 * is how you reset it.
 */

/** Optional everywhere — blank falls through to the stylesheet. */
function optionalHex(value: unknown): string | true {
  return value ? slugValidator.color(value) : true;
}

function colorField(
  name: string,
  label: string,
  description: string,
): NonNullable<GlobalConfig['fields']>[number] {
  return {
    name,
    type: 'text',
    label,
    admin: {
      components: { Field: '@/payload/components/ColorField#ColorField' },
      description,
      width: '50%',
    },
    validate: optionalHex,
  };
}

export const MapAppearance: GlobalConfig = {
  slug: 'map-appearance',
  label: 'Map appearance',
  admin: {
    description:
      'The colours riders see. Trail and condition colours live under Lists — these are the interface itself. Leave a field blank for the default.',
    group: 'Settings',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      type: 'row',
      fields: [
        colorField(
          'secondaryColor',
          'Deep surface',
          'The trail panel, primary buttons and headings. The darkest colour on the map.',
        ),
        colorField(
          'surfaceColor',
          'Light surface',
          'The detail dock, condition pills and text sitting on the deep surface.',
        ),
      ],
    },
    {
      type: 'row',
      fields: [
        colorField(
          'primaryColor',
          'Highlight',
          'The selected trail, active switches and focus rings. Used sparingly — one thing per screen.',
        ),
        colorField(
          'accentColor',
          'Accent',
          'Small marks against the deep surface, like the logo. Needs to be legible on it.',
        ),
      ],
    },
    {
      type: 'row',
      fields: [
        colorField(
          'inkColor',
          'Body text',
          'Reading copy on the light surface. Contrast against it matters more than the hue.',
        ),
      ],
    },
  ],
};
