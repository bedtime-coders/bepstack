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
let articleSlug: string;

describe("Fast API Tests with Eden Treaty", () => {
	beforeAll(async () => {
		// Reset database
		await db.$executeRaw`TRUNCATE TABLE users, articles, tags, comments CASCADE`;
	});

	afterAll(async () => {
		await db.$disconnect();
	});

	describe("Authentication", () => {
		it("should register a user", async () => {
			const { data, error } = await api.users.post({
				user: testUser,
			});

			expect(error).toBeNull();
			expect(data?.user).toBeDefined();
			expect(data?.user.username).toBe(testUser.username);

			if (data?.user?.token) {
				authToken = data.user.token;
			}
		});

		it("should login a user", async () => {
			const { data, error } = await api.users.login.post({
				user: {
					email: testUser.email,
					password: testUser.password,
				},
			});

			expect(error).toBeNull();
			expect(data?.user.token).toBeDefined();
		});

		it("should get current user", async () => {
			const { data, error } = await api.user.get({
				headers: {
					Authorization: `Token ${authToken}`,
				},
			});

			expect(error).toBeNull();
			expect(data?.user.username).toBe(testUser.username);
		});
	});

	describe("Articles", () => {
		it("should create an article", async () => {
			const { data, error } = await api.articles.post(
				{
					article: testArticle,
				},
				{
					headers: {
						Authorization: `Token ${authToken}`,
					},
				},
			);

			expect(error).toBeNull();
			expect(data?.article.title).toBe(testArticle.title);
			if (data?.article?.slug) {
				articleSlug = data.article.slug;
			}
		});

		it("should get all articles", async () => {
			const { data, error } = await api.articles.get({
				query: { limit: 10, offset: 0 },
			});

			expect(error).toBeNull();
			expect(data?.articles).toBeDefined();
			expect(data?.articlesCount).toBeGreaterThan(0);
		});

		it("should get articles by author", async () => {
			const { data, error } = await api.articles.get({
				query: { author: testUser.username },
			});

			expect(error).toBeNull();
			expect(data?.articles).toBeDefined();
			expect(data?.articles.length).toBeGreaterThan(0);
		});

		it("should get articles by tag", async () => {
			const { data, error } = await api.articles.get({
				query: { tag: "test" },
			});

			expect(error).toBeNull();
			expect(data?.articles).toBeDefined();
			expect(data?.articles.length).toBeGreaterThan(0);
		});

		it("should get feed articles", async () => {
			const { data, error } = await api.articles.feed.get({
				headers: {
					Authorization: `Token ${authToken}`,
				},
				query: { limit: 10, offset: 0 },
			});

			expect(error).toBeNull();
			expect(data?.articles).toBeDefined();
		});
	});

	describe("Tags", () => {
		it("should get all tags", async () => {
			const { data, error } = await api.tags.get();

			expect(error).toBeNull();
			expect(data?.tags).toBeDefined();
			expect(Array.isArray(data?.tags)).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should handle unauthorized access", async () => {
			const { data, error } = await api.articles.post({
				article: testArticle,
				// No Authorization header
			});

			expect(error).toBeDefined();
			expect(data).toBeNull();
		});
	});
});
