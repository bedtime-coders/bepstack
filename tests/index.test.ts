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

// Create type-safe API client with Eden Treaty
const { api } = treaty(app);

// Test data
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

const newUser3 = {
	email: "newuser@test.com",
	username: "newuser",
	password: "Password123",
};

const newUser4 = {
	email: "newuser2@test.com",
	username: "newuser2",
	password: "Password123",
};

const testArticle = {
	title: "Test Article",
	description: "Test Description",
	body: "Test Body",
	tagList: ["test", "article"],
};

const testComment = {
	body: "Thank you so much!",
};

let authToken: string;
let authToken2: string;
let articleSlug: string;

beforeAll(async () => {
	// Reset database
	await db.$executeRaw`TRUNCATE TABLE users, articles, tags, comments CASCADE`;

	// Register first user
	const reg1 = await api.users.post({ user: testUser });
	authToken = reg1.data?.user?.token ?? "";

	// Register second user
	const reg2 = await api.users.post({ user: testUser2 });
	authToken2 = reg2.data?.user?.token ?? "";

	// Login first user (to ensure token is valid)
	const login1 = await api.users.login.post({
		user: { email: testUser.email, password: testUser.password },
	});
	authToken = login1.data?.user?.token ?? "";

	// Login second user (to ensure token is valid)
	const login2 = await api.users.login.post({
		user: { email: testUser2.email, password: testUser2.password },
	});
	authToken2 = login2.data?.user?.token ?? "";
});

describe("Fast API Tests with Eden Treaty", () => {
	afterAll(async () => {
		await db.$disconnect();
	});

	describe("Authentication", () => {
		it("should register user", async () => {
			const newUser = {
				email: "basic@test.com",
				username: "basicuser",
				password: "Password123",
			};

			const { data, error } = await api.users.post({
				user: newUser,
			});

			expect(error).toBeNull();
			expect(data?.user).toBeDefined();
			expect(data?.user.email).toBe(newUser.email);
			expect(data?.user.username).toBe(newUser.username);
			expect(data?.user).toHaveProperty("bio");
			expect(data?.user).toHaveProperty("image");
			expect(data?.user).toHaveProperty("token");
		});

		it("should login user", async () => {
			const { data, error } = await api.users.login.post({
				user: { email: testUser.email, password: testUser.password },
			});

			expect(error).toBeNull();
			expect(data?.user).toBeDefined();
			expect(data?.user.email).toBe(testUser.email);
			expect(data?.user.username).toBe(testUser.username);
			expect(data?.user).toHaveProperty("bio");
			expect(data?.user).toHaveProperty("image");
			expect(data?.user).toHaveProperty("token");
		});

		it("should login and remember token", async () => {
			const { data, error } = await api.users.login.post({
				user: { email: testUser2.email, password: testUser2.password },
			});

			expect(error).toBeNull();
			expect(data?.user).toBeDefined();
			expect(data?.user.email).toBe(testUser2.email);
			expect(data?.user.username).toBe(testUser2.username);
			expect(data?.user).toHaveProperty("bio");
			expect(data?.user).toHaveProperty("image");
			expect(data?.user).toHaveProperty("token");

			// Verify token is valid by using it to get current user
			const token = data?.user?.token;
			expect(token).toBeDefined();

			const { data: userData, error: userError } = await api.user.get({
				headers: { Authorization: `Token ${token}` },
			});
			expect(userError).toBeNull();
			expect(userData?.user.email).toBe(testUser2.email);
		});

		it("should get current user", async () => {
			const { data, error } = await api.user.get({
				headers: {
					Authorization: `Token ${authToken}`,
				},
			});

			expect(error).toBeNull();
			expect(data?.user.username).toBe(testUser.username);
			expect(data?.user.email).toBe(testUser.email);
			expect(data?.user).toHaveProperty("bio");
			expect(data?.user).toHaveProperty("image");
			expect(data?.user).toHaveProperty("token");
		});

		it("should update user", async () => {
			const updatedEmail = "updated@test.com";
			const { data, error } = await api.user.put(
				{
					user: { email: updatedEmail },
				},
				{
					headers: {
						Authorization: `Token ${authToken}`,
					},
				},
			);

			expect(error).toBeNull();
			expect(data?.user.email).toBe(updatedEmail);
			expect(data?.user).toHaveProperty("username");
			expect(data?.user).toHaveProperty("bio");
			expect(data?.user).toHaveProperty("image");
			expect(data?.user).toHaveProperty("token");

			// Re-login to get a new valid token after email update
			const login = await api.users.login.post({
				user: { email: updatedEmail, password: testUser.password },
			});
			authToken = login.data?.user?.token ?? "";

			// Re-login second user as well
			const login2 = await api.users.login.post({
				user: { email: testUser2.email, password: testUser2.password },
			});
			authToken2 = login2.data?.user?.token ?? "";

			// --- Add token validity checks ---
			const { data: user1Data, error: user1Error } = await api.user.get({
				headers: { Authorization: `Token ${authToken}` },
			});
			expect(user1Error).toBeNull();
			expect(user1Data?.user.email).toBe(updatedEmail);

			const { data: user2Data, error: user2Error } = await api.user.get({
				headers: { Authorization: `Token ${authToken2}` },
			});
			expect(user2Error).toBeNull();
			expect(user2Data?.user.email).toBe(testUser2.email);
		});

		it("should not register user with missing fields", async () => {
			const { data, error } = await api.users.post({
				user: { email: "", password: "", username: "" },
			});
			expect(error).toBeDefined();
			expect(data).toBeNull();
		});

		it("should not register user with duplicate email", async () => {
			// Create newUser 3, expect success
			const res = await api.users.post({
				user: newUser3,
			});
			expectSuccess(res);
			// Create newUser 4, but use newUser3's email
			const res2 = await api.users.post({
				user: { ...newUser4, email: newUser3.email },
			});
			expect(res2.error).toBeDefined();
			expect(res2.data).toBeNull();
		});

		it("should not register user with duplicate username", async () => {
			const { data, error } = await api.users.post({
				user: {
					email: "another@email.com",
					password: testUser.password,
					username: testUser.username,
				},
			});
			expect(error).toBeDefined();
			expect(data).toBeNull();
		});

		it("should not login with wrong password", async () => {
			const { data, error } = await api.users.login.post({
				user: { email: testUser.email, password: "wrongpassword" },
			});
			expect(error).toBeDefined();
			expect(data).toBeNull();
		});

		it("should not login with missing fields", async () => {
			const { data, error } = await api.users.login.post({
				user: { email: "", password: "" },
			});
			expect(error).toBeDefined();
			expect(data).toBeNull();
		});
	});

	describe("Articles", () => {
		it("should get all articles (empty)", async () => {
			const { data, error } = await api.articles.get({
				query: { limit: 10, offset: 0 },
			});

			expect(error).toBeNull();
			expect(data?.articles).toBeDefined();
			expect(Array.isArray(data?.articles)).toBe(true);
			expect(data?.articlesCount).toBe(0);
		});

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

			if (data?.article?.slug) {
				articleSlug = data.article.slug;
			}
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
			expect(Array.isArray(data?.articles)).toBe(true);
		});

		it("should get all articles", async () => {
			const { data, error } = await api.articles.get({
				query: { limit: 10, offset: 0 },
			});

			expect(error).toBeNull();
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

			expect(error).toBeNull();
			expect(data?.articles).toBeDefined();
			expect(Array.isArray(data?.articles)).toBe(true);
		});

		it("should get articles by author", async () => {
			const { data, error } = await api.articles.get({
				query: { author: testUser.username },
			});

			expect(error).toBeNull();
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

			expect(error).toBeNull();
			expect(data?.articles).toBeDefined();
			expect(Array.isArray(data?.articles)).toBe(true);
		});

		it("should get single article by slug", async () => {
			const { data, error } = await api.articles({ slug: articleSlug }).get();

			expect(error).toBeNull();
			expect(data?.article).toBeDefined();
			expect(data?.article.slug).toBe(articleSlug);
			expect(data?.article.title).toBe(testArticle.title);
		});

		it("should get articles by tag", async () => {
			const { data, error } = await api.articles.get({
				query: { tag: "test" },
			});

			expect(error).toBeNull();
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

			expect(error).toBeNull();
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
			const updatedBody = "With two hands";
			const { data, error } = await api.articles({ slug: articleSlug }).put(
				{
					article: { body: updatedBody },
				},
				{
					headers: {
						Authorization: `Token ${authToken}`,
					},
				},
			);

			expect(error).toBeNull();
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
			const { data, error } = await api
				.articles({ slug: articleSlug })
				.favorite.post(
					{},
					{
						headers: {
							Authorization: `Token ${authToken2}`,
						},
					},
				);

			expect(error).toBeNull();
			expect(data?.article).toBeDefined();
			expect(data?.article.favorited).toBe(true);
			expect(data?.article.favoritesCount).toBeGreaterThan(0);
		});

		it("should get articles favorited by username", async () => {
			const { data, error } = await api.articles.get({
				query: { favorited: testUser2.username },
			});

			expect(error).toBeNull();
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

			expect(error).toBeNull();
			expect(data?.articles).toBeDefined();
			expect(Array.isArray(data?.articles)).toBe(true);
		});

		it("should unfavorite article", async () => {
			const { data, error } = await api
				.articles({ slug: articleSlug })
				.favorite.delete(undefined, {
					headers: {
						Authorization: `Token ${authToken2}`,
					},
				});
			expect(error).toBeNull();
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
			const { data, error } = await api.articles({ slug: articleSlug }).put(
				{ article: { body: "hacked" } },
				{
					headers: {
						Authorization: `Token ${authToken2}`,
					},
				},
			);
			expect(error).toBeDefined();
			expect(data).toBeNull();
		});

		it("should not delete article as non-author", async () => {
			const { error } = await api
				.articles({ slug: articleSlug })
				.delete(undefined, {
					headers: {
						Authorization: `Token ${authToken2}`,
					},
				});
			expect(error).toBeDefined();
		});

		it("should not favorite article as unauthenticated user", async () => {
			const { data, error } = await api
				.articles({ slug: articleSlug })
				.favorite.post();
			expect(error).toBeDefined();
			expect(data).toBeNull();
		});

		it("should not unfavorite article as unauthenticated user", async () => {
			const { data, error } = await api
				.articles({ slug: articleSlug })
				.favorite.delete();
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

	describe("Comments", () => {
		it("should create comment for article", async () => {
			const { data, error } = await api
				.articles({ slug: articleSlug })
				.comments.post(
					{
						comment: testComment,
					},
					{
						headers: {
							Authorization: `Token ${authToken}`,
						},
					},
				);

			expect(error).toBeNull();
			expectToBeDefined(data);

			expect(data.comment).toBeDefined();
			expect(data.comment.body).toBe(testComment.body);
			expect(data.comment).toHaveProperty("id");
			expect(data.comment).toHaveProperty("createdAt");
			expect(data.comment).toHaveProperty("updatedAt");
			expect(data.comment).toHaveProperty("author");

			expect(data.comment.author).toBeDefined();

			// Validate ISO 8601 timestamps
			expect(new Date(data.comment.createdAt).toISOString()).toBe(
				data.comment.createdAt,
			);
			expect(new Date(data.comment.updatedAt).toISOString()).toBe(
				data.comment.updatedAt,
			);

			// Comment ID is available but we don't need to store it for later use
			expect(data.comment.id).toBeDefined();
		});

		it("should get all comments for article", async () => {
			const { data, error } = await api
				.articles({ slug: articleSlug })
				.comments.get({
					headers: {
						Authorization: `Token ${authToken}`,
					},
				});

			expect(error).toBeNull();
			expectToBeDefined(data);
			expectToBeDefined(data.comments);
			expect(Array.isArray(data.comments)).toBe(true);
			expect(data.comments.length).toBeGreaterThan(0);
		});

		it("should get all comments for article without login", async () => {
			const { data, error } = await api
				.articles({ slug: articleSlug })
				.comments.get();

			expect(error).toBeNull();
			expect(data?.comments).toBeDefined();
			expect(Array.isArray(data?.comments)).toBe(true);
		});

		it("should delete comment for article", async () => {
			// First, create a comment to delete
			const { data: createData, error: createError } = await api
				.articles({ slug: articleSlug })
				.comments.post(
					{
						comment: testComment,
					},
					{
						headers: {
							Authorization: `Token ${authToken}`,
						},
					},
				);

			expect(createError).toBeNull();
			expectToBeDefined(createData);
			const commentId = createData.comment.id;

			// Now delete the comment
			const res = await api
				.articles({ slug: articleSlug })
				.comments({ id: commentId })
				.delete(undefined, {
					headers: {
						Authorization: `Token ${authToken}`,
					},
				});
			expectSuccess(res);

			// Verify the comment is gone
			const { data } = await api.articles({ slug: articleSlug }).comments.get({
				headers: {
					Authorization: `Token ${authToken}`,
				},
			});
			expectToBeDefined(data);
			const commentIds = data.comments.map((c) => c.id);
			expect(commentIds.includes(commentId.toString())).toBe(false);
		});

		it("should not create comment as unauthenticated user", async () => {
			const { data, error } = await api
				.articles({ slug: articleSlug })
				.comments.post({ comment: testComment });
			expect(error).toBeDefined();
			expect(data).toBeNull();
		});

		it("should not delete comment as non-author", async () => {
			// First, create a comment to try to delete
			const { data: createData, error: createError } = await api
				.articles({ slug: articleSlug })
				.comments.post(
					{
						comment: testComment,
					},
					{
						headers: {
							Authorization: `Token ${authToken}`,
						},
					},
				);

			expect(createError).toBeNull();
			expectToBeDefined(createData);
			const commentId = createData.comment.id;

			// Try to delete as different user (should fail)
			const { error } = await api
				.articles({ slug: articleSlug })
				.comments({ id: commentId })
				.delete(undefined, {
					headers: {
						Authorization: `Token ${authToken2}`,
					},
				});
			expect(error).toBeDefined();
		});

		it("should not delete non-existent comment", async () => {
			const { error } = await api
				.articles({ slug: articleSlug })
				.comments({ id: 999999 })
				.delete(undefined, {
					headers: {
						Authorization: `Token ${authToken}`,
					},
				});
			expect(error).toBeDefined();
		});
	});

	describe("Profiles", () => {
		it("should get profile", async () => {
			const { data, error } = await api
				.profiles({ username: testUser2.username })
				.get();

			expect(error).toBeNull();
			expect(data?.profile).toBeDefined();
			expect(data?.profile.username).toBe(testUser2.username);
			expect(data?.profile).toHaveProperty("bio");
			expect(data?.profile).toHaveProperty("image");
			expect(data?.profile).toHaveProperty("following");
		});

		it("should follow profile", async () => {
			const { data, error } = await api
				.profiles({ username: testUser2.username })
				.follow.post(
					{},
					{
						headers: {
							Authorization: `Token ${authToken}`,
						},
					},
				);

			expect(error).toBeNull();
			expect(data?.profile).toBeDefined();
			expect(data?.profile.username).toBe(testUser2.username);
			expect(data?.profile).toHaveProperty("bio");
			expect(data?.profile).toHaveProperty("image");
			expect(data?.profile).toHaveProperty("following");
			expect(data?.profile.following).toBe(true);
		});

		it("should unfollow profile", async () => {
			const { data, error } = await api
				.profiles({ username: testUser2.username })
				.follow.delete(undefined, {
					headers: {
						Authorization: `Token ${authToken}`,
					},
				});
			expect(error).toBeNull();
			expect(data?.profile).toBeDefined();
			expect(data?.profile.username).toBe(testUser2.username);
			expect(data?.profile.following).toBe(false);
		});

		it("should not follow profile as unauthenticated user", async () => {
			const { data, error } = await api
				.profiles({ username: testUser2.username })
				.follow.post();
			expect(error).toBeDefined();
			expect(data).toBeNull();
		});

		it("should not unfollow profile as unauthenticated user", async () => {
			const { data, error } = await api
				.profiles({ username: testUser2.username })
				.follow.delete();
			expect(error).toBeDefined();
			expect(data).toBeNull();
		});

		it("should not follow non-existent user", async () => {
			const { data, error } = await api
				.profiles({ username: "nonexistentuser" })
				.follow.post(
					{},
					{
						headers: {
							Authorization: `Token ${authToken}`,
						},
					},
				);
			expect(error).toBeDefined();
			expect(data).toBeNull();
		});

		it("should not unfollow non-existent user", async () => {
			const { data, error } = await api
				.profiles({ username: "nonexistentuser" })
				.follow.delete(undefined, {
					headers: {
						Authorization: `Token ${authToken}`,
					},
				});
			expect(error).toBeDefined();
			expect(data).toBeNull();
		});
	});

	describe("Tags", () => {
		it("should get all tags", async () => {
			const { data, error } = await api.tags.get();

			expect(error).toBeNull();
			expect(data?.tags).toBeDefined();
			expect(Array.isArray(data?.tags)).toBe(true);
			expect(data?.tags.length).toBeGreaterThan(0);
		});
	});

	describe("Article Cleanup", () => {
		it("should delete article", async () => {
			const { error } = await api
				.articles({ slug: articleSlug })
				.delete(undefined, {
					headers: {
						Authorization: `Token ${authToken}`,
					},
				});
			expect(error).toBeNull();
		});
	});

	describe("Error Handling", () => {
		it("should handle unauthorized article creation", async () => {
			const { data, error } = await api.articles.post({
				article: testArticle,
				// No Authorization header
			});

			expect(error).toBeDefined();
			expect(data).toBeNull();
		});

		it("should handle unauthorized user access", async () => {
			const { data, error } = await api.user.get({
				// No Authorization header
			});

			expect(error).toBeDefined();
			expect(data).toBeNull();
		});

		it("should handle invalid login", async () => {
			const { data, error } = await api.users.login.post({
				user: {
					email: "nonexistent@test.com",
					password: "wrongpassword",
				},
			});

			expect(error).toBeDefined();
			expect(data).toBeNull();
		});
	});
});
