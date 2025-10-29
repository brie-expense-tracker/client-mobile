// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Ban raw console.* calls (except error/warn which are stripped by Babel in prod)
      // Use logger utility from @/utils/logger instead
      "no-console": ["error", {
        allow: ["warn", "error"] // Still allow these for critical errors
      }],
    },
  },
  {
    // Exclude logger files themselves and tests from console ban
    files: [
      "src/utils/logger.ts",
      "src/utils/logger.example.ts",
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
    ],
    rules: {
      "no-console": "off",
    },
  },
]);
