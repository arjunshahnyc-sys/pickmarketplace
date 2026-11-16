import type { MetadataRoute } from 'next';

// Lets a phone add Pick to its home screen ("Add to Home Screen" on iPhone,
// "Install app" on Android). Opened from that icon the site runs full
// screen with no browser bars, like an app. There is no service worker and
// nothing is cached for offline use: this is the icon and the full-screen
// window, nothing more.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pick Marketplace',
    short_name: 'Pick',
    description:
      'Type in what you want. Pick looks for a different product with the same key specs, reviews about as good, and a lower price.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/app-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/app-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
