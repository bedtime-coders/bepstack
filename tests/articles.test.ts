import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "@/core/app";
import { db } from "@/core/db";

function expectToBeDefined<T>(value: T | null | undefined): asserts value is T {
	expect(value).toBeDefined();
}

function expectSuccess(response: { error: unknown; data: unknown }) {
	expect(response.error).toBeNull();
	expect(response.data).toBeDefined();
}

const { api } = treaty(app);

const testUser = {
	email: "test@test.com",
	username: "testuser",
	password: "Password123",
};

const testUser2 = {
	email: "celeb@test.com",
	username: "celeb_testuser",
	password: "Password123",
};

const testArticle = {
	title: "Test Article",
	description: "Test Description",
	body: "Test Body",
	tagList: ["test", "article"],
};

let authToken: string;
let authToken2: string;
let articleSlug: string;

beforeAll(async () => {
	await db.$executeRaw`TRUNCATE TABLE users, articles, tags, comments CASCADE`;

	const reg1 = await api.users.post({ user: testUser });
	authToken = reg1.data?.user?.token ?? "";

	const reg2 = await api.users.post({ user: testUser2 });
	authToken2 = reg2.data?.user?.token ?? "";

	const login1 = await api.users.login.post({
		user: { email: testUser.email, password: testUser.password },
	});
	authToken = login1.data?.user?.token ?? "";

	const login2 = await api.users.login.post({
		user: { email: testUser2.email, password: testUser2.password },
	});
	authToken2 = login2.data?.user?.token ?? "";
});

afterAll(async () => {
	await db.$disconnect();
});

describe("Articles", () => {
	// ... (PASTE ALL ARTICLE-RELATED TESTS FROM index.test.ts HERE)
});
