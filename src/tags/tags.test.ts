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
	if (reg1.error || !reg1.data?.user?.token) {
		throw new Error(
			`User registration failed: ${reg1.error ? JSON.stringify(reg1.error) : "No token returned"}`,
		);
	}
	authToken = reg1.data.user.token;

	// Create an article with tags to ensure tags exist
	const articleRes = await api.articles.post(
		{
			article: testArticle,
		},
		{
			headers: {
				Authorization: `Token ${authToken}`,
			},
		},
	);
	if (articleRes.error || !articleRes.data?.article) {
		throw new Error(
			`Article creation failed: ${articleRes.error ? JSON.stringify(articleRes.error) : "No article returned"}`,
		);
	}
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
