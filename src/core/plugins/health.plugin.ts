import { sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { StatusCodes } from "http-status-codes";
import { db } from "@/core/drizzle";
import { RealWorldError } from "@/shared/errors";

export const health = new Elysia({
	tags: ["Health"],
}).get(
	"health",
	async ({ set }) => {
		// check the database connection
		const isDbHealthy = await db.execute(sql`SELECT 1`);
		if (!isDbHealthy) {
			throw new RealWorldError(StatusCodes.SERVICE_UNAVAILABLE, {
				database: ["not healthy"],
			});
		}
		set.status = StatusCodes.NO_CONTENT;
	},
	{
		detail: {
			summary: "Health check",
			description: "Check the health of the application",
		},
		response: {
			[StatusCodes.NO_CONTENT]: t.Void({
				description: "The application is healthy",
			}),
		},
	},
);
