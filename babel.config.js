// babel.config.js
module.exports = function (api) {
    api.cache(true); // single cache decision

    const isProd = process.env.BABEL_ENV === 'production' || process.env.NODE_ENV === 'production';

    return {
        presets: ['babel-preset-expo'],
        plugins: [
            isProd && ['transform-remove-console', { exclude: ['error', 'warn'] }],
            // Reanimated plugin MUST be last
            'react-native-reanimated/plugin',
        ].filter(Boolean),
    };
};
