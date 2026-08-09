/* THIS FILE IS PART OF PAYLOAD'S ADMIN SCAFFOLDING — see docs/adr/0001.
 *
 * The (payload) route group is deliberately separate from the public map so
 * Payload's global CSS can't leak into it. Nothing here imports app code.
 */
import type { ServerFunctionClient } from 'payload';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import localFont from 'next/font/local';
import config from '@payload-config';
import { importMap } from './admin/importMap';

import '@payloadcms/next/css';
// Must come after Payload's stylesheet — see the note in custom.css about why
// this needs no !important.
import './custom.css';

// The same self-hosted Geist the public app uses, so the admin doesn't look
// like a different product. Loaded here rather than shared with (frontend)
// because the two route groups are separate trees with no common layout.
const geistSans = localFont({
  display: 'swap',
  src: '../(frontend)/fonts/Geist-Variable.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  display: 'swap',
  src: '../(frontend)/fonts/GeistMono-Variable.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
});

type Args = {
  children: React.ReactNode;
};

const serverFunction: ServerFunctionClient = async (args) => {
  'use server';
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

// The admin's own appearance is not editable — it is whatever `custom.css`
// says. What a curator themes is the public map, under Settings → Theme.
export default function Layout({ children }: Args) {
  return (
    <RootLayout
      // htmlProps is the supported way to reach Payload's <html>; it renders
      // that element itself, so the font variables have to go through here.
      htmlProps={{ className: `${geistSans.variable} ${geistMono.variable}` }}
      config={config}
      importMap={importMap}
      serverFunction={serverFunction}
    >
      {children}
    </RootLayout>
  );
}
