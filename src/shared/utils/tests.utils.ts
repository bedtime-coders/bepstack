import { expect } from "bun:test";

export function expectToBeDefined<T>(
	value: T | null | undefined,
): asserts value is T {
	expect(value).toBeDefined();
}

export function expectSuccess(response: { error: unknown; data: unknown }) {
	expect(response.error).toBeNull();
	expect(response.data).toBeDefined();
}

export function formatError(error: unknown): string {
	if (error instanceof Error) {
		return `${error.name}: ${error.message}\n${error.stack || ""}`;
	}
	if (typeof error === "object" && error !== null) {
		return JSON.stringify(error, null, 2);
	}
	return String(error);
}
