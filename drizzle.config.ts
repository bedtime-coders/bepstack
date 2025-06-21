import { defineConfig } from "drizzle-kit";
import { env } from "@/core/env";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/**/*.schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
});
