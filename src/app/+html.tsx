import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * HTML shell for the Expo web build.
 *
 * Registers the service worker so the app installs as a PWA and works offline.
 * The service worker itself lives at public/sw.js (copied verbatim to dist/).
 */
export default function Root({ children }: PropsWithChildren) {
  // When hosted under a subpath (e.g. GitHub Pages at /kondor), Expo's
  // experiments.baseUrl is exposed here so our hand-written static asset links
  // resolve correctly. Empty string when served from the domain root.
  const base = process.env.EXPO_BASE_URL ?? '';
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#208AEF" />

        {/* PWA manifest — file exists at public/manifest.json (copied verbatim to dist/) */}
        <link rel="manifest" href={`${base}/manifest.json`} />

        {/* PWA icons — files exist at public/icon-192.png and public/icon-512.png */}
        <link rel="apple-touch-icon" href={`${base}/icon-192.png`} />

        {/* Reset scroll-view styles for full-screen RN Web apps */}
        <ScrollViewStyleReset />

        {/* Register service worker for offline support and PWA install */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker
                    .register('${base}/sw.js')
                    .catch(function (err) {
                      console.warn('[SW] registration failed:', err);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
