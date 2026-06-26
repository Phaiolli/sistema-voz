import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    exclude: ["e2e/**", "**/node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Coverage gate applies to the LOGIC LAYERS only (Maestro decision,
      // Lote 5). UI components/pages (`src/app/**/page.tsx`,
      // `src/components/**`) are intentionally OUT of this gate — they are
      // covered separately by Testing Library / Playwright. Previously
      // `include` was a tiny allowlist that hid untested modules and inflated
      // the metric; it now spans the whole logic surface.
      include: ["src/lib/**", "src/app/api/**"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/*.d.ts",
        // Type-only / generated — no testable logic.
        "src/lib/types.ts",
        "src/lib/db/schema.ts",
        "src/lib/db/database.types.ts",
        // Synthetic seed/test data, not production logic.
        "src/lib/fixtures.ts",
        // Infra client factories / barrels — no business logic, just construct
        // an external SDK client (would need integration tests, not units).
        "src/lib/stripe.ts",
        "src/lib/supabase.ts",
        "src/lib/db/client.ts",
        // Pure re-export of NextAuth handlers (barrel). Brackets are glob
        // character classes, so match the dir with a wildcard segment.
        "src/app/api/auth/*nextauth*/route.ts",
        // Browser canvas/QR rendering — presentation logic exercised via
        // Testing Library / Playwright, not the unit logic gate.
        "src/lib/qr.ts",
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
