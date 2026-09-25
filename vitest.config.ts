import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@compartido": path.resolve(__dirname, "compartido"),
    },
  },
  test: {
    // Las pruebas de componentes declaran `// @vitest-environment jsdom` arriba.
    environment: "node",
    setupFiles: ["./pruebas/setup.ts"],
    include: ["pruebas/**/*.test.ts", "pruebas/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "compartido/**", "src/componentes/**"],
      exclude: ["src/lib/entorno.ts", "src/lib/auth.ts", "src/lib/generador.ts"],
      thresholds: { lines: 60, functions: 60, branches: 50, statements: 60 },
      reporter: ["text", "html"],
    },
  },
});
