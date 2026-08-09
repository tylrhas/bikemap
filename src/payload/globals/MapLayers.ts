import type { GlobalConfig } from 'payload';

/**
 * What the map offers, editable at `/admin/globals/map-layers`.
 *
 * These switches control whether a rider is **asked**, not what they choose.
 * Turning one off removes it from the sidebar and stops its layer being
 * attached at all — a fork that only wants to show its own curated trails would
 * otherwise have to delete the toggle in code.
 *
 * Mountain trails have no switch on purpose: they are what the app is for, and
 * a form that lets you turn off everything leaves a rider looking at a map with
 * nothing on it.
 *
 * Separate from Theme, which is what the map looks like. This is what it has in
 * it.
 */
export const MapLayers: GlobalConfig = {
  slug: 'map-layers',
  label: 'Map layers',
  admin: {
    description:
      'Which sections and layers riders get. Turning one off removes it from the sidebar. Mountain trails are always shown.',
    group: 'Settings',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'casualRoutes',
      type: 'checkbox',
      defaultValue: true,
      label: 'Offer casual routes',
      admin: {
        description:
          'The Casual routes section: scenic loops, greenways, attractions, bike shops and rentals. Turn it off for a site that is only about singletrack.',
      },
    },
    {
      name: 'rides',
      type: 'checkbox',
      defaultValue: true,
      label: 'Offer ride tracking',
      admin: {
        description:
          'My rides: recording with GPS, saved history, GPX export. Rides never leave the rider’s own device — turning this off removes the feature, it does not delete anything already saved.',
      },
    },
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
