import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite 8 parses with rolldown, so JSX needs the plugin rather than an
  // esbuild option.
  plugins: [react()],
  test: {
    // Existing util tests stay on node; component tests opt in with a
    // `@vitest-environment jsdom` docblock.
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
});
