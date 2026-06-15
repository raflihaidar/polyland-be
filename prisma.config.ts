import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./backend/src/prisma/schema.prisma",
  migrations: {
    path: "./backend/src/prisma/migrations",
    seed: "tsx ./backend/src/prisma/seeds/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
