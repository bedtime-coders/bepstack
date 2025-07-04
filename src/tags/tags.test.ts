import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "@/core/app";
import { db } from "@/core/db";

// Create type-safe API client with Eden Treaty
const { api } = treaty(app);

// Test data
const testUser = {
	email: "test@test.com",
	username: "testuser",
	password: "Password123",
};

const testArticle = {
	title: "Test Article",
	description: "Test Description",
	body: "Test Body",
	tagList: ["test", "article"],
};

let authToken: string;

beforeAll(async () => {
	// Reset database
	await db.$executeRaw`TRUNCATE TABLE users, articles, tags, comments CASCADE`;

	// Register user
	const reg1 = await api.users.post({ user: testUser });
	authToken = reg1.data?.user?.token ?? "";

	// Login user (to ensure token is valid)
	const login1 = await api.users.login.post({
		user: { email: testUser.email, password: testUser.password },
	});
	authToken = login1.data?.user?.token ?? "";

	// Create an article with tags to ensure tags exist
	await api.articles.post(
		{
			article: testArticle,
		},
		{
			headers: {
				Authorization: `Token ${authToken}`,
			},
		},
	);
});

describe("Tags Tests", () => {
	afterAll(async () => {
		await db.$disconnect();
	});

	it("should get all tags", async () => {
		const { data, error } = await api.tags.get();

		expect(error).toBeNull();
		expect(data?.tags).toBeDefined();
		expect(Array.isArray(data?.tags)).toBe(true);
		expect(data?.tags.length).toBeGreaterThan(0);
	});
});
