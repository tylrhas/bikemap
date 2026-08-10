import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import 'mapbox-gl/dist/mapbox-gl.css';
import './globals.css';
import './map.css';
import Script from 'next/script';
import { headers } from 'next/headers';
import { siteConfig, siteConfigForHostname } from '@/config/site.config';
import { getMapBrand } from '@/payload/read/map-appearance';

// Self-hosted to keep production builds reproducible and offline-capable
// (next/font/google would fetch from Google Fonts at build time).
const geistSans = localFont({
  src: './fonts/Geist-Variable.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
});

const geistMono = localFont({
  src: './fonts/GeistMono-Variable.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
});

// Fraunces for trail names and section titles; Public Sans for everything
// else. Self-hosted for the same reason Geist is — the design brief asks for
// next/font/google, but its concern is a runtime @import, and local files
// satisfy that without giving up a build that needs no network.
// The file is a single SemiBold instance — its only axis is `opsz`, so weight
// does not vary and `font-bold` on display text will not make it heavier. That
// is what the brief asks for ("Fraunces (600), use with restraint"); the range
// below is declared so the browser matches rather than synthesises.
const displayFont = localFont({
  src: './fonts/Fraunces-Variable.woff2',
  variable: '--font-display',
  weight: '400 700',
  display: 'swap',
});

const bodyFont = localFont({
  src: './fonts/PublicSans-Variable.woff2',
  variable: '--font-body',
  weight: '400 700',
  display: 'swap',
});

/** Declared on <html> so `:root` can resolve them — see the note in RootLayout. */
const FONT_VARIABLES = [
  displayFont.variable,
  bodyFont.variable,
  geistSans.variable,
  geistMono.variable,
].join(' ');

export async function generateMetadata(): Promise<Metadata> {
  const config = siteConfigForHostname(await getRequestHostname());

  return {
    title: config.name,
    description: config.description,
    alternates: {
      canonical: config.url,
    },
    icons: {
      icon: [
        { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-to-zoom is intentionally left enabled for accessibility.
  viewportFit: 'cover',
  themeColor: siteConfig.themeColor,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = siteConfigForHostname(await getRequestHostname());
  // Colors and type edited in the admin win over the defaults in globals.css.
  // Empty when nothing is saved or the database is unreachable — the map keeps
  // its brand either way.
  const brand = await getMapBrand();

  return (
    // The font variables go on <html>, not <body>, because `globals.css`
    // resolves them on `:root`. A custom property substitutes its own `var()`
    // references on the element it is declared on — so `--app-font-display`,
    // declared on `:root` as `var(--font-display), Georgia, serif`, was
    // resolving against an element that did not have `--font-display` and
    // becoming invalid. Everything then fell back to the browser's default
    // serif, which is why the app was not in its own fonts.
    <html className={FONT_VARIABLES} lang="en">
      <head>
        {/* A deployment that names its own fonts has to load them from
            somewhere. The bundled faces need no such request, which is why
            leaving this blank is the faster path and the default. */}
        {brand.fontUrl && <link href={brand.fontUrl} rel="stylesheet" />}
        {/* Built from values the read layer validated, never from raw input —
            a malformed color or font name is dropped rather than escaped. */}
        {brand.css && <style dangerouslySetInnerHTML={{ __html: brand.css }} />}
        <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={config.shortName} />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        {/* iOS splash screens */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1320x2868.png"
          media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1290x2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1206x2622.png"
          media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1179x2556.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1242x2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-828x1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1242x2208.png"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-2048x2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1668x2388.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1668x2224.png"
          media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1640x2360.png"
          media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1620x2160.png"
          media="(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2)"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Script src="/register-sw.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

async function getRequestHostname(): Promise<string | undefined> {
  try {
    const requestHeaders = await headers();
    return (
      requestHeaders.get('x-forwarded-host') ??
      requestHeaders.get('host') ??
      undefined
    );
  } catch {
    return undefined;
  }
}
