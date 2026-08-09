import type { GlobalConfig } from 'payload';
import { safeUrl, sanitizeFontStack } from '@/data/brand';
import { slugValidator } from '@/payload/collections/vocabulary-fields';

/**
 * The site's theme, editable at `/admin/globals/map-appearance`.
 *
 * Labelled **Theme**, and it is the only one — the admin's own appearance is
 * whatever `src/app/(payload)/custom.css` says and is not editable. There used
 * to be a second global for that, which meant two things called a theme and a
 * curator having to know which was which.
 *
 * The slug stays `map-appearance`: it is the table name and the column prefix,
 * so renaming it to match the label would be a migration and a sweep for a
 * word. Same trade as "Steward" over `organizations`.
 *
 * Only colors something actually reads are here. Trail and condition colors
 * are already curated under Lists, and a control that changes nothing is worse
 * than no control — so the palette's unused members are deliberately absent.
 *
 * The logo and the webfont are **URLs, not uploads**. This repo has no uploads
 * collection and no storage adapter, and adding one means a bucket every forker
 * has to provision (ADR-0001, C3). A URL costs nothing, and `public/` is
 * already a place to put a file.
 *
 * Every field is optional: blank means the default in `globals.css` or
 * `site.config.ts`, so a deployment that never opens this form is fully
 * branded, and clearing a field is how you reset it.
 */

/** Optional everywhere — blank falls through to the stylesheet. */
function optionalHex(value: unknown): string | true {
  return value ? slugValidator.color(value) : true;
}

/**
 * The read layer drops anything it doesn't recognise, so a bad value is never
 * dangerous — but it is silently ignored, which looks like the field is broken.
 * Validating with the same functions means you're told at the point of saving.
 */
function urlField(value: unknown): string | true {
  if (!value) {
    return true;
  }
  return safeUrl(String(value))
    ? true
    : 'Use a full https:// address, or a path starting with / for a file in public/.';
}

function fontField(value: unknown): string | true {
  if (!value) {
    return true;
  }
  return sanitizeFontStack(String(value))
    ? true
    : 'Font names, commas and quotes only — this goes straight into a stylesheet.';
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
  label: 'Theme',
  admin: {
    description:
      'The name, colors and type riders see on the map. Trail and condition colors live under Lists — these are the interface itself. Leave a field blank for the default.',
    group: 'Settings',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    // Unnamed tabs, as on the trail form: a named tab would nest these under
    // its key in the document *and* the database.
    {
      type: 'tabs',
      tabs: [
        {
          description:
            'What sits at the top of the trail panel. Blank falls back to the site name in site.config.ts.',
          fields: identityFields(),
          label: 'Identity',
        },
        {
          description:
            'Five colors the whole interface is built from. Leave one blank for the default.',
          fields: colorFields(),
          label: 'Colors',
        },
        {
          description:
            'Two faces: one for trail names and headings, one for everything else. Naming a font here does not fetch it — either the reader already has it, or the stylesheet defines it.',
          fields: typeFields(),
          label: 'Type',
        },
      ],
    },
  ],
};

// Declared as functions, not consts: `MapAppearance` is evaluated at import
// time, and a `const` below it would still be in its temporal dead zone.
function identityFields(): NonNullable<GlobalConfig['fields']> {
  return [
    {
      name: 'wordmark',
      type: 'text',
      label: 'Wordmark',
      admin: {
        description:
          'The name beside the logo. Also the logo’s alt text, so fill it in even when you have a logo.',
        placeholder: 'Bend Trails',
      },
    },
    {
      name: 'logoUrl',
      type: 'text',
      label: 'Logo URL',
      admin: {
        description:
          'Shown instead of the name. Any image the browser can load — SVG keeps its edges on a retina screen. Drop a file in public/ and point at /logo.svg, or paste a full https:// address.',
        placeholder: '/logo.svg',
      },
      validate: urlField,
    },
  ];
}

function colorFields(): NonNullable<GlobalConfig['fields']> {
  return [
    {
      type: 'row',
      fields: [
        colorField(
          'secondaryColor',
          'Deep surface',
          'The trail panel, primary buttons and headings. The darkest color on the map.',
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
  ];
}

function typeFields(): NonNullable<GlobalConfig['fields']> {
  return [
    {
      name: 'fontUrl',
      type: 'text',
      label: 'Font stylesheet URL',
      admin: {
        description:
          'A stylesheet that defines your fonts — a Google Fonts or Fontshare link, or your own @font-face file. Leave blank to use fonts the reader already has. Note this is fetched when the page loads: the bundled fonts are not, which is why they stay the default.',
        placeholder: 'https://fonts.googleapis.com/css2?family=…&display=swap',
      },
      validate: urlField,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'displayFont',
          type: 'text',
          label: 'Display font',
          admin: {
            description:
              'Trail names and headings. A stack, best to worst: "Fraunces", Georgia, serif.',
            placeholder: '"Fraunces", Georgia, serif',
            width: '50%',
          },
          validate: fontField,
        },
        {
          name: 'bodyFont',
          type: 'text',
          label: 'Body font',
          admin: {
            description:
              'Everything else — list rows, stats, buttons. Legible at 11px matters more than character.',
            placeholder: '"Public Sans", system-ui, sans-serif',
            width: '50%',
          },
          validate: fontField,
        },
      ],
    },
  ];
}
