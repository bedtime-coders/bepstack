import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "@/core/app";
import { expectNoError, registerAndLoginUser } from "@/tests/utils";

// Create type-safe API client with Eden Treaty
const { api } = treaty(app);

// Test data
const testUser = {
	email: "tags_test@test.com",
	username: "tags_test_user",
	password: "Password123",
};

const testArticle = {
	title: "Test Article",
	description: "Test Description",
	body: "Test Body",
	tagList: ["test", "article"],
};

let authToken: string;

// Register user and create article with tags for tests
beforeEach(async () => {
	authToken = await registerAndLoginUser(testUser);

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
	it("should get all tags", async () => {
		const { data, error } = await api.tags.get();

		expectNoError(error);
		expect(data?.tags).toBeDefined();
		expect(Array.isArray(data?.tags)).toBe(true);
		expect(data?.tags.length).toBeGreaterThan(0);
	});
});
