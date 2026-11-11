/**
 * Service worker for the web build (served under /play).
 *
 * Precache-only: the game never talks to a server, so once the shell and
 * bundle are cached it works fully offline. skipWaiting is OFF on purpose:
 * a new version waits until the player taps "Reload" in the update toast
 * (see public/index.html), so nobody gets swapped mid-puzzle and nobody gets
 * stuck on a stale build forever.
 */
module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,html,css,json,png,ico,ttf,woff,woff2,svg}'],
  globIgnores: ['sw.js', 'workbox-*.js', 'metadata.json'],
  swDest: 'dist/sw.js',
  navigateFallback: '/play/index.html',
  navigateFallbackAllowlist: [/^\/play(\/|$)/],
  skipWaiting: false,
  clientsClaim: false,
  cleanupOutdatedCaches: true,
  sourcemap: false,
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  // Metro already puts a content hash in bundle filenames.
  dontCacheBustURLsMatching: /-[0-9a-f]{16,}\.(js|css)$/,
};
