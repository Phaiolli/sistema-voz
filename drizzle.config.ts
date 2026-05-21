import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use the Supabase Session pooler URL (port 5432) for migrations
    url: process.env.DATABASE_URL!,
  },
});
