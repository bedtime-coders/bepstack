import { expect } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "@/core/app";
import { db } from "@/core/db";

const { api } = treaty(app);

// Type definitions for Eden/Elysia errors
interface EdenError {
	status: number;
	value?: unknown;
	message?: string;
	[key: string]: unknown;
}

interface ErrorWithStatus {
	status: number;
	[key: string]: unknown;
}

interface ErrorWithMessage {
	message: string;
	[key: string]: unknown;
}

// Type guards
function isEdenError(error: unknown): error is EdenError {
	return (
		typeof error === "object" &&
		error !== null &&
		"status" in error &&
		typeof (error as EdenError).status === "number"
	);
}

function isErrorWithStatus(error: unknown): error is ErrorWithStatus {
	return (
		typeof error === "object" &&
		error !== null &&
		"status" in error &&
		typeof (error as ErrorWithStatus).status === "number"
	);
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
	return (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof (error as ErrorWithMessage).message === "string"
	);
}

export function expectToBeDefined<T>(
	value: T | null | undefined,
): asserts value is T {
	expect(value).toBeDefined();
}

// Bulletproof error logger for test failures
export function logTestError(error: unknown) {
	if (!error) return;

	if (isEdenError(error)) {
		console.error("Status:", error.status);
		if (error.value) {
			console.error(
				"Value:",
				typeof error.value === "object"
					? JSON.stringify(error.value, null, 2)
					: error.value,
			);
		}
		return;
	}

	// If it's an Error instance (but not a plain object)
	if (error instanceof Error) {
		console.error(`${error.name}: ${error.message}`);
		return;
	}

	// Fallback for primitives
	console.error("Error:", String(error));
}

export function expectSuccess(response: { error: unknown; data: unknown }) {
	if (response.error) {
		logTestError(response.error);
	}
	expectNoError(response.error);
	expect(response.data).toBeDefined();
}

// export function expectNoError(error: unknown) {
// 	if (error) {
// 		logTestError(error);
// 	}
// 	expect(error).toBeNull();
// }

// Utils to expect a null error, and if it's not, log it nicely
// DEPRECATED: Use logAndExpectNullError instead
export function expectNullError(error: unknown) {
	if (error) {
		console.error("❌ Test error (deprecated):", error);
		console.error("❌ Test error (deprecated, formatted):", formatError(error));
	}
	expectNoError(error);
}

export function logAndExpectNullError(error: unknown) {
	if (error) {
		console.error("❌ Test error:", error);
		console.error("❌ Test error (formatted):", formatError(error));
	}
	expectNoError(error);
}

export function formatError(error: unknown): string {
	if (error instanceof Error) {
		return `${error.name}: ${error.message}\n${error.stack || ""}`;
	}
	if (isEdenError(error)) {
		let msg = "";
		msg += `Status: ${error.status}\n`;
		if (error.value) msg += `Value: ${JSON.stringify(error.value, null, 2)}\n`;
		const { status: _, value: __, ...rest } = error;
		if (Object.keys(rest).length)
			msg += `Other: ${JSON.stringify(rest, null, 2)}\n`;
		return msg;
	}
	if (typeof error === "object" && error !== null) {
		return JSON.stringify(error, null, 2);
	}
	return String(error);
}

/**
 * Get all table names from the database schema
 * This dynamically discovers tables to avoid hard-coding table names
 */
async function getTableNames(): Promise<string[]> {
	try {
		// Query to get all table names from the current schema
		const result = await db.$queryRaw<{ tablename: string }[]>`
			SELECT tablename 
			FROM pg_tables 
			WHERE schemaname = 'public' 
			ORDER BY tablename;
		`;

		return result.map((row) => row.tablename);
	} catch (error) {
		console.warn("⚠️ Could not dynamically discover table names:", error);
		console.warn("Falling back to hard-coded table names");

		// Fallback to known table names from the schema
		return [
			"_UserFavorites",
			"_UserFollows",
			"_ArticleToTag",
			"comments",
			"articles",
			"tags",
			"users",
		];
	}
}

/**
 * Reset the database by truncating all tables
 *
 * This function truncates all tables in the database to ensure a clean state for tests.
 * It handles both explicit tables and implicit many-to-many tables created by Prisma.
 *
 * Tables truncated (dynamically discovered):
 * - users: User accounts and authentication data
 * - articles: Article content and metadata
 * - comments: Article comments
 * - tags: Article tags
 * - _UserFavorites: Many-to-many relationship for user article favorites
 * - _UserFollows: Many-to-many relationship for user follows
 * - _ArticleToTag: Many-to-many relationship for article tags
 *
 * @param options.verbose - Whether to log success messages (default: false)
 * @throws {Error} If database truncation fails
 */
export async function resetDb(options: { verbose?: boolean } = {}) {
	try {
		// Dynamically discover table names to avoid hard-coding
		const tableNames = await getTableNames();

		if (tableNames.length === 0) {
			throw new Error("No tables found in database. Run migrations first.");
		}

		// Build the TRUNCATE statement dynamically
		const tablesList = tableNames.map((name) => `"${name}"`).join(",\n\t\t\t");

		// Use raw SQL to properly truncate all tables including implicit many-to-many tables
		// RESTART IDENTITY resets auto-increment sequences
		// CASCADE ensures foreign key constraints are handled properly
		await db.$executeRawUnsafe(`
			TRUNCATE TABLE
				${tablesList}
			RESTART IDENTITY
			CASCADE;
		`);

		if (options.verbose) {
			console.log(`✅ Database reset: truncated ${tableNames.length} tables`);
		}
	} catch (error) {
		console.error("❌ Database reset failed:", error);
		console.error("This may indicate:");
		console.error("  - Database connection issues");
		console.error("  - Schema changes that require migration");
		console.error("  - Permission issues");
		console.error("  - Tables don't exist (run migrations first)");
		console.error("  - Foreign key constraint violations");

		// Re-throw the error to fail the test
		throw new Error(
			`Database reset failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export async function registerAndLoginUser(user: {
	email: string;
	username: string;
	password: string;
}) {
	const reg = await api.users.post({ user });
	if (reg.error || !reg.data?.user?.token) {
		throw new Error(
			`Registration failed: ${reg.error ? JSON.stringify(reg.error) : "No token"}`,
		);
	}
	return reg.data.user.token;
}

export async function disconnectDb() {
	await db.$disconnect();
}

export function expectNoError(
	error: unknown,
	opts?: { allowStatus?: number | number[] },
) {
	if (!error) {
		expect(error).toBeNull();
		return;
	}
	logTestError(error);

	// Allow certain statuses if specified
	if (opts?.allowStatus && isErrorWithStatus(error)) {
		const status = error.status;
		if (
			(Array.isArray(opts.allowStatus) && opts.allowStatus.includes(status)) ||
			status === opts.allowStatus
		) {
			// For array case, just check if status is in the array
			if (Array.isArray(opts.allowStatus)) {
				expect(opts.allowStatus).toContain(status);
			} else {
				expect(status).toBe(opts.allowStatus);
			}
			return;
		}
	}

	// If error has a status, assert on that (but avoid printing the raw object)
	if (isErrorWithStatus(error)) {
		const status = error.status;
		// Use a more specific assertion that won't print the raw object
		expect(status).toBe(0);
		return;
	}

	// If error has a message, assert on that
	if (isErrorWithMessage(error)) {
		const message = error.message;
		expect(message).toBe("");
		return;
	}

	// For any other case, just assert that the error is falsy
	// This avoids printing the raw object
	expect(Boolean(error)).toBe(false);
}

// Utility for tests that expect errors to occur
export function expectError(error: unknown) {
	if (!error) {
		// Only log if we expected an error but got none
		console.error("Expected an error but got none");
		expect(error).toBeDefined();
		return;
	}

	// Don't log error details for expected errors - only log if the test fails
	// If error has a status, assert on that
	if (isErrorWithStatus(error)) {
		const status = error.status;
		expect(status).toBeGreaterThan(0);
		return;
	}

	// If error has a message, assert on that
	if (isErrorWithMessage(error)) {
		const message = error.message;
		expect(message).toBeDefined();
		return;
	}

	// Fallback: just assert that error exists
	expect(Boolean(error)).toBe(true);
}
