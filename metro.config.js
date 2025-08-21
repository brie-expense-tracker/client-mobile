// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// allow .cjs imports
config.resolver.sourceExts.push('cjs');
// <-- this line is the key fix
config.resolver.unstable_enablePackageExports = false;

module.exports = config;