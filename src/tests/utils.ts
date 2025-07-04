import { expect } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "@/core/app";
import { db } from "@/core/db";

const { api } = treaty(app);

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

export async function resetDb() {
	await db.$executeRaw`TRUNCATE TABLE users, articles, tags, comments CASCADE`;
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
	// Optionally, login again to ensure token is valid
	const login = await api.users.login.post({
		user: { email: user.email, password: user.password },
	});
	if (login.error || !login.data?.user?.token) {
		throw new Error(
			`Login failed: ${login.error ? JSON.stringify(login.error) : "No token"}`,
		);
	}
	return login.data.user.token;
}

export async function disconnectDb() {
	await db.$disconnect();
}
