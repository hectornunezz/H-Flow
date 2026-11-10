import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "**/.next-*/**",
    "**/node_modules/**",
    "**/dist/**",
    "coverage/**",
    "logs/**",
    "out/**",
    "build/**",
    "**/next-env.d.ts",
  ]),
  {
    rules: {
      // Network-loading effects set pending/error state as the request starts.
      "react-hooks/set-state-in-effect": "warn",
      // Express request type augmentation uses this declaration form by design.
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
    },
  },
  {
    files: ["tests/**/*.test.ts"],
    rules: {
      // Jest module factories intentionally use require for runtime-mocked modules.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
