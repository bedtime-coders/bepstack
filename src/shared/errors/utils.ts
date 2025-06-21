import camelcase from "camelcase";
import type { DrizzleQueryError } from "drizzle-orm/errors";
import type { NotFoundError, ValidationError } from "elysia";
import type { Prisma } from "@/core/db";
import { ConflictingFieldsError } from "./conflicting-fields";
import { PrismaErrorCode } from "./prisma";

// Defined temporarily until Elysia exports the type
type ElysiaCustomStatusResponse = {
	code: number;
	response: string;
};

export function isElysiaError(err: unknown): err is ElysiaCustomStatusResponse {
	return (
		typeof err === "object" &&
		err !== null &&
		"code" in err &&
		"response" in err
	);
}

/**
 * Turn "/user/email" into "user.email"
 * @param path
 * @returns
 */
function parsePath(path: string): string {
	return path
		.replace(/^\//, "") // remove leading slash
		.replace(/\//g, ".") // convert slash to dot notation
		.replace(/\[(\d+)\]/g, ".$1"); // optional: convert [0] to .0
}

export function formatValidationError(error: ValidationError) {
	if (error.all.length === 0) {
		return {
			errors: {
				[error.type ?? "body"]: "Invalid value",
			},
		};
	}
	const result: Record<string, string[]> = {};

	for (const err of error.all) {
		const path = "path" in err ? parsePath(err.path) : "general";
		let message =
			"schema" in err
				? (err.schema.description ?? err.summary ?? "Invalid value")
				: (err.summary ?? "Invalid value");

		// 🧼 Remove redundant prefix: "Property 'user.image' should be ..."
		message = message.replace(/^Property '.*?' should /i, "should ");

		if (!result[path]) {
			result[path] = [];
		}

		result[path].push(message);
	}

	// Remove duplicates in each path's messages
	for (const path in result) {
		result[path] = [...new Set(result[path])];
	}

	return { errors: result };
}

export function formatNotFoundError(error: NotFoundError) {
	return {
		errors: {
			[error.message.toLowerCase()]: "not found",
		},
	};
}

export function formatDrizzleError(error: DrizzleQueryError) {
	console.error(error);
	return {
		errors: {
			database: "error occurred",
		},
	};
}

const DEFAULT_ENTITY_NAME = "database";

const modelToEntityName = (model: string) => camelcase(model);

const getEntityNameFromMeta = (
	meta: Prisma.PrismaClientKnownRequestError["meta"],
): string => {
	if (!meta) return DEFAULT_ENTITY_NAME;
	if (meta.modelName && typeof meta.modelName === "string")
		return modelToEntityName(meta.modelName);
	if (meta.model && typeof meta.model === "string")
		return modelToEntityName(meta.model);
	return DEFAULT_ENTITY_NAME;
};

export function formatDbError(error: Prisma.PrismaClientKnownRequestError) {
	const entity = getEntityNameFromMeta(error.meta);
	if (error.code === PrismaErrorCode.RecordNotFound) {
		return {
			errors: {
				[entity]: "not found",
			},
		};
	}
	console.error(error);
	return {
		errors: {
			database: "error occurred",
		},
	};
}

type Fields<T extends string> = Partial<Record<T, string>>;

/**
 * Assert that no conflicts exist in the given fields.
 * @param entity The entity that is being checked for conflicts, singular. (e.g. "user")
 * @param fields A mapping of fields to check for conflicts, keyed by field name, value by field value. (e.g. `{ email: "test@example.com" }`)
 * @param queryFn A function that returns a boolean indicating whether a conflict exists.
 * @throws If a conflict is found ({@link ConflictingFieldsError})
 *
 * @example
 * ```ts
 * await assertNoConflicts("user", { email: "test@example.com" }, async (field, value) => {
 *   const existing = await db.query.users.findFirst({ where: eq(users[field], value) });
 *   return Boolean(existing);
 * });
 * ```
 */
export async function assertNoConflicts<T extends string>(
	entity: string,
	fields: Fields<T>,
	queryFn: (key: T, value: string) => Promise<boolean>,
): Promise<void> {
	const entries = Object.entries(fields) as [T, string | undefined][];

	const conflicts = await Promise.all(
		entries.map(async ([key, value]) =>
			value && (await queryFn(key, value)) ? key : null,
		),
	);

	const conflictingFields = conflicts.filter(
		(f): f is Awaited<T> => f !== null,
	);

	if (conflictingFields.length > 0) {
		throw new ConflictingFieldsError(entity, conflictingFields);
	}
}
