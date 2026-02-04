const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow expo-sqlite web worker to resolve the wa-sqlite wasm asset.
config.resolver.assetExts.push('wasm');

module.exports = config;
