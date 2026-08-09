import type { GlobalConfig } from 'payload';

/**
 * Which optional layers the map offers, editable at `/admin/globals/map-layers`.
 *
 * These switches control whether a rider is **asked**, not what they choose.
 * Turning one off removes its toggle from the sidebar and stops the layer being
 * attached at all — a fork that only wants to show its own curated trails would
 * otherwise have to delete the toggle in code.
 *
 * Separate from Theme, which is what the map looks like. This is what it has in
 * it.
 */
export const MapLayers: GlobalConfig = {
  slug: 'map-layers',
  label: 'Map layers',
  admin: {
    description:
      'Which optional layers riders can switch on. Turning one off removes its toggle from the sidebar.',
    group: 'Settings',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'osmTrails',
      type: 'checkbox',
      // On by default, so an existing deployment keeps what it had and a new
      // one gets the app as it ships.
      defaultValue: true,
      label: 'Offer nationwide trails',
      admin: {
        description:
          'Every bike-relevant path in OpenStreetMap, nationwide — useful next to a curated set, noise if your riders only care about yours. Riders switch it on themselves; this decides whether they are offered it.',
      },
    },
  ],
};
