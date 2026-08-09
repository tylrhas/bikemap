import type { GlobalConfig } from 'payload';
import { slugValidator } from '@/payload/collections/vocabulary-fields';

/**
 * The public map's brand colours, editable at
 * `/admin/globals/map-appearance`.
 *
 * Separate from the `theme` global, which dresses the admin. A curator changing
 * how riders see the map and an admin changing how their own tools look are
 * different decisions, and mixing them into one form makes both confusing.
 *
 * These are the only two colours the interface uses. Trail colours are already
 * data — they come off the rating and kind rows (Lists), and condition colours
 * off the condition rows — so this is the whole of what is left.
 */
export const MapAppearance: GlobalConfig = {
  slug: 'map-appearance',
  label: 'Map appearance',
  admin: {
    description:
      'The colours riders see. Trail and condition colours live under Lists — these are the interface itself.',
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
        {
          name: 'primaryColor',
          type: 'text',
          label: 'Highlight',
          admin: {
            components: { Field: '@/payload/components/ColorField#ColorField' },
            description:
              'Selected trails, focus rings, the main button. Used sparingly — leave blank for the default.',
            width: '50%',
          },
          validate: (value: unknown): string | true =>
            value ? slugValidator.color(value) : true,
        },
        {
          name: 'secondaryColor',
          type: 'text',
          label: 'Text',
          admin: {
            components: { Field: '@/payload/components/ColorField#ColorField' },
            description:
              'Headings and body text across the map interface. Needs to stay readable on white.',
            width: '50%',
          },
          validate: (value: unknown): string | true =>
            value ? slugValidator.color(value) : true,
        },
      ],
    },
  ],
};
