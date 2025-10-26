// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// allow .cjs imports
config.resolver.sourceExts.push('cjs');
// <-- this line is the key fix
config.resolver.unstable_enablePackageExports = false;

// Strip console statements in production builds
if (!__DEV__) {
    config.resolver.alias = {
        ...config.resolver.alias,
        'console': './src/utils/noop-console.js'
    };
}

module.exports = config;