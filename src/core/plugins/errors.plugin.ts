import { type Elysia, NotFoundError, ValidationError } from "elysia";
import { pick } from "radashi";
import { Prisma } from "@/core/db";
import { DEFAULT_ERROR_MESSAGE } from "@/shared/constants";
import {
	formatDbError,
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
