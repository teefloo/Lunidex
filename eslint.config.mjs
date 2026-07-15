import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // jsx-a11y/alt-text requires an `alt` prop that does not exist on React Native
    // components. expo-image uses `accessibilityLabel` instead.
    files: ['apps/mobile/**'],
    rules: {
      'jsx-a11y/alt-text': 'off',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".vercel/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Custom ignores:
    "**/*_Conflict.*",
    "tmp/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;
