import { DrizzleQueryError } from "drizzle-orm/errors";
import { type Elysia, NotFoundError, ValidationError } from "elysia";
import { pick } from "radashi";
import { DEFAULT_ERROR_MESSAGE } from "@/shared/constants";
import {
	formatDBError,
	formatNotFoundError,
	formatValidationError,
	isElysiaError,
	RealWorldError,
} from "@/shared/errors";

export const errors = (app: Elysia) =>
	app.onError(({ error, code, set }) => {
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

		// db errors
		if (error instanceof DrizzleQueryError) {
			return formatDBError(error);
		}

		// Generic error message
		const reason = isElysiaError(error)
			? error.response
			: DEFAULT_ERROR_MESSAGE;

		console.error(error);

		return {
			errors: {
				[code.toString().toLowerCase()]: [reason],
			},
		};
	});
