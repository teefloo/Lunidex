module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            // Consume the shared business-logic package straight from source so
            // there is no build step between web and mobile.
            '@primedex/core': '../../packages/core/src',
          },
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.native.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.native.tsx',
            '.tsx',
            '.json',
          ],
        },
      ],
      // Reanimated's plugin must be listed last.
      'react-native-reanimated/plugin',
    ],
  };
};
