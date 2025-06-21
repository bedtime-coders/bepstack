import { DrizzleQueryError } from "drizzle-orm/errors";
import { type Elysia, NotFoundError, ValidationError } from "elysia";
import { pick } from "radashi";
import { Prisma } from "@/core/db";
import { DEFAULT_ERROR_MESSAGE } from "@/shared/constants";
import {
	formatDbError,
	formatDrizzleError,
	formatNotFoundError,
	formatValidationError,
	RealWorldError,
} from "@/shared/errors";

export const errors = (app: Elysia) =>
	app.onError(({ error, set }) => {
		// Manually thrown errors
		if (error instanceof RealWorldError) {
			set.status = error.status;
			return pick(error, ["errors"]);
		}

		// Elysia validation errors (TypeBox based)
		if (error instanceof ValidationError) {
			return formatValidationError(error);
		}

		// Elysia not found errors
		if (error instanceof NotFoundError) {
			return formatNotFoundError(error);
		}

		// drizzle errors
		if (error instanceof DrizzleQueryError) {
			return formatDrizzleError(error);
		}

		// prisma errors
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			return formatDbError(error);
		}

		console.error(error);

		return {
			errors: {
				unknown: [DEFAULT_ERROR_MESSAGE],
			},
		};
	});
