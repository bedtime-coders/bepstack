import { Elysia, t } from "elysia";
import { StatusCodes } from "http-status-codes";
import { RealWorldError } from "@/shared/errors";
import { db } from "../db";

export const health = new Elysia({
	tags: ["Health"],
}).get(
	"health",
	async ({ set }) => {
		try {
			await db.$queryRaw`SELECT 1`;
			set.status = StatusCodes.NO_CONTENT;
		} catch {
			throw new RealWorldError(StatusCodes.SERVICE_UNAVAILABLE, {
				database: ["not healthy"],
			});
		}
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
