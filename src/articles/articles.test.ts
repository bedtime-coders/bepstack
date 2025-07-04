import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "@/core/app";
import {
	expectNoError,
	expectToBeDefined,
	registerAndLoginUser,
} from "@/tests/utils";

const { api } = treaty(app);

const testUser = {
	email: "articles_test@test.com",
	username: "articles_test_user",
	password: "Password123",
};

const testUser2 = {
	email: "celeb_articles@test.com",
	username: "celeb_articles_user",
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

// Register users for tests
beforeEach(async () => {
	authToken = await registerAndLoginUser(testUser);
	authToken2 = await registerAndLoginUser(testUser2);
});

async function createTestArticle(token = authToken) {
	const { data, error } = await api.articles.post(
		{ article: testArticle },
		{ headers: { Authorization: `Token ${token}` } },
	);
	if (error || !data?.article?.slug) {
		throw new Error(
			`Failed to create article: ${error ? JSON.stringify(error) : "No slug returned"}`,
		);
	}
	return data.article.slug;
}

describe("Articles", () => {
	it("should get all articles (empty)", async () => {
		const { data, error } = await api.articles.get({
			query: { limit: 10, offset: 0 },
		});

		expectNoError(error);
		expect(data?.articles).toBeDefined();
		expect(Array.isArray(data?.articles)).toBe(true);
		expect(data?.articlesCount).toBe(0);
	});

	it("should create an article", async () => {
		const slug = await createTestArticle();
		const { data, error } = await api.articles({ slug }).get();
		expectNoError(error);
		expect(data?.article).toBeDefined();
		expect(data?.article.title).toBe(testArticle.title);
		expect(data?.article.description).toBe(testArticle.description);
		expect(data?.article.body).toBe(testArticle.body);
		expect(data?.article).toHaveProperty("slug");
		expect(data?.article).toHaveProperty("createdAt");
		expect(data?.article).toHaveProperty("updatedAt");
		expect(Array.isArray(data?.article.tagList)).toBe(true);
		expect(data?.article).toHaveProperty("author");
		expect(data?.article).toHaveProperty("favorited");
		expect(data?.article).toHaveProperty("favoritesCount");
		expect(Number.isInteger(data?.article.favoritesCount)).toBe(true);
	});

	it("should get feed articles", async () => {
		const { data, error } = await api.articles.feed.get({
			headers: {
				Authorization: `Token ${authToken}`,
			},
			query: { limit: 10, offset: 0 },
		});

		expectNoError(error);
		expect(data?.articles).toBeDefined();
		expect(Array.isArray(data?.articles)).toBe(true);
	});

	it("should get all articles", async () => {
		// First create an article to ensure there's data to retrieve
		await createTestArticle();

		const { data, error } = await api.articles.get({
			query: { limit: 10, offset: 0 },
		});

		expectNoError(error);
		expect(data?.articles).toBeDefined();
		expect(data?.articlesCount).toBeGreaterThan(0);
		expect(Array.isArray(data?.articles)).toBe(true);
	});

	it("should get all articles with auth", async () => {
		const { data, error } = await api.articles.get({
			headers: {
				Authorization: `Token ${authToken}`,
			},
			query: { limit: 10, offset: 0 },
		});

		expectNoError(error);
		expect(data?.articles).toBeDefined();
		expect(Array.isArray(data?.articles)).toBe(true);
	});

	it("should get articles by author", async () => {
		// First create an article to ensure there's data to retrieve
		await createTestArticle();

		const { data, error } = await api.articles.get({
			query: { author: testUser.username },
		});

		expectNoError(error);
		expect(data?.articles).toBeDefined();
		expect(data?.articles.length).toBeGreaterThan(0);
	});

	it("should get articles by author with auth", async () => {
		const { data, error } = await api.articles.get({
			headers: {
				Authorization: `Token ${authToken}`,
			},
			query: { author: testUser.username },
		});

		expectNoError(error);
		expect(data?.articles).toBeDefined();
		expect(Array.isArray(data?.articles)).toBe(true);
	});

	it("should get single article by slug", async () => {
		const slug = await createTestArticle();
		const { data, error } = await api.articles({ slug }).get();
		expectNoError(error);
		expect(data?.article).toBeDefined();
		expect(data?.article.slug).toBe(slug);
		expect(data?.article.title).toBe(testArticle.title);
	});

	it("should get articles by tag", async () => {
		// First create an article to ensure there's data to retrieve
		await createTestArticle();

		const { data, error } = await api.articles.get({
			query: { tag: "test" },
		});

		expectNoError(error);
		expect(data?.articles).toBeDefined();
		expect(data?.articles.length).toBeGreaterThan(0);
	});

	it("should get articles by tag with auth", async () => {
		const { data, error } = await api.articles.get({
			headers: {
				Authorization: `Token ${authToken}`,
			},
			query: { tag: "test" },
		});

		expectNoError(error);
		expectToBeDefined(data);
		expect(data.articles).toBeDefined();
		expect(Array.isArray(data.articles)).toBe(true);
		if (data.articles.length > 0) {
			const article = data.articles[0];
			expectToBeDefined(article);
			expect(article).toHaveProperty("title");
			expect(article).toHaveProperty("slug");
			expect(article).toHaveProperty("createdAt");
			expect(article).toHaveProperty("updatedAt");
			expect(article).toHaveProperty("description");
			expect(article).toHaveProperty("tagList");
			expect(Array.isArray(article.tagList)).toBe(true);
			expect(article).toHaveProperty("author");
			expect(article).toHaveProperty("favorited");
			expect(article).toHaveProperty("favoritesCount");
			expect(Number.isInteger(article.favoritesCount)).toBe(true);
		}
	});

	it("should update article", async () => {
		const slug = await createTestArticle();
		const updatedBody = "With two hands";
		const { data, error } = await api
			.articles({ slug })
			.put(
				{ article: { body: updatedBody } },
				{ headers: { Authorization: `Token ${authToken}` } },
			);
		expectNoError(error);
		expect(data?.article).toBeDefined();
		expect(data?.article.body).toBe(updatedBody);
		expect(data?.article.title).toBe(testArticle.title);
		expect(data?.article).toHaveProperty("slug");
		expect(data?.article).toHaveProperty("createdAt");
		expect(data?.article).toHaveProperty("updatedAt");
		expect(data?.article).toHaveProperty("description");
		expect(Array.isArray(data?.article.tagList)).toBe(true);
		expect(data?.article).toHaveProperty("author");
		expect(data?.article).toHaveProperty("favorited");
		expect(data?.article).toHaveProperty("favoritesCount");
		expect(Number.isInteger(data?.article.favoritesCount)).toBe(true);
	});

	it("should favorite article", async () => {
		const slug = await createTestArticle();
		const { data, error } = await api.articles({ slug }).favorite.post(
			{},
			{
				headers: {
					Authorization: `Token ${authToken2}`,
				},
			},
		);
		expectNoError(error);
		expect(data?.article).toBeDefined();
		expect(data?.article.favorited).toBe(true);
		expect(data?.article.favoritesCount).toBeGreaterThan(0);
	});

	it("should get articles favorited by username", async () => {
		const { data, error } = await api.articles.get({
			query: { favorited: testUser2.username },
		});

		expectNoError(error);
		expect(data?.articles).toBeDefined();
		expect(Array.isArray(data?.articles)).toBe(true);
	});

	it("should get articles favorited by username with auth", async () => {
		const { data, error } = await api.articles.get({
			headers: {
				Authorization: `Token ${authToken}`,
			},
			query: { favorited: testUser2.username },
		});

		expectNoError(error);
		expect(data?.articles).toBeDefined();
		expect(Array.isArray(data?.articles)).toBe(true);
	});

	it("should unfavorite article", async () => {
		const slug = await createTestArticle();
		// First, favorite the article
		await api.articles({ slug }).favorite.post(
			{},
			{
				headers: { Authorization: `Token ${authToken2}` },
			},
		);
		// Now, unfavorite
		const { data, error } = await api
			.articles({ slug })
			.favorite.delete(undefined, {
				headers: { Authorization: `Token ${authToken2}` },
			});
		expectNoError(error);
		expect(data?.article).toBeDefined();
		expect(data?.article.favorited).toBe(false);
	});

	it("should not get non-existent article by slug", async () => {
		const { data, error } = await api
			.articles({ slug: "non-existent-slug" })
			.get();
		expect(error).toBeDefined();
		expect(data).toBeNull();
	});

	it("should not update article as non-author", async () => {
		const slug = await createTestArticle();
		const { data, error } = await api
			.articles({ slug })
			.put(
				{ article: { body: "hacked" } },
				{ headers: { Authorization: `Token ${authToken2}` } },
			);
		expect(error).toBeDefined();
		expect(data).toBeNull();
	});

	it("should not delete article as non-author", async () => {
		const slug = await createTestArticle();
		const { error } = await api.articles({ slug }).delete(undefined, {
			headers: { Authorization: `Token ${authToken2}` },
		});
		expect(error).toBeDefined();
	});

	it("should not favorite article as unauthenticated user", async () => {
		const slug = await createTestArticle();
		const { data, error } = await api.articles({ slug }).favorite.post();
		expect(error).toBeDefined();
		expect(data).toBeNull();
	});

	it("should not unfavorite article as unauthenticated user", async () => {
		const slug = await createTestArticle();
		const { data, error } = await api.articles({ slug }).favorite.delete();
		expect(error).toBeDefined();
		expect(data).toBeNull();
	});

	it("should not create article with missing fields", async () => {
		const { data, error } = await api.articles.post({
			article: { title: "", description: "", body: "", tagList: [] },
		});
		expect(error).toBeDefined();
		expect(data).toBeNull();
	});
});
