const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow importing Drizzle's generated .sql migration files.
config.resolver.sourceExts.push('sql');

// expo-sqlite on web ships a WASM SQLite build; register the asset extension.
config.resolver.assetExts.push('wasm');

module.exports = config;
