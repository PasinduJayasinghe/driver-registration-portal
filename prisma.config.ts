// Prisma 7 CLI configuration.
// `migrations` & `prisma db ...` commands use DIRECT_URL (session pooler / direct).
// Runtime queries use the pooled connection via the PrismaPg adapter in src/lib/prisma.js.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
