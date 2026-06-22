const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow importing Drizzle's generated .sql migration files.
config.resolver.sourceExts.push('sql');

// expo-sqlite on web ships a WASM SQLite build; register the asset extension.
config.resolver.assetExts.push('wasm');

// expo-sqlite's web worker uses SharedArrayBuffer, which browsers only expose
// when the page is cross-origin isolated. Send COOP/COEP on the dev server.
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return middleware(req, res, next);
  },
};

module.exports = config;
