import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "path";
import { defineConfig, env } from "prisma/config";

expand(config({ path: path.resolve(process.cwd(), ".env") }));
export default defineConfig({
    //   schema: "prisma/schema.prisma",
    schema: "prisma/models",
    migrations: {
        path: "prisma/migrations",
        // seed: "tsx prisma/seed.ts",
    },
    engine: "classic",
    datasource: {
        url: env("DATABASE_URL"),
    },
});
