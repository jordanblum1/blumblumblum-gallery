import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// Flat config replaces .eslintrc.json: eslint-config-next 16 ships flat configs
// and peers on eslint >=9, which the legacy eslintrc loader could not consume.
export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
