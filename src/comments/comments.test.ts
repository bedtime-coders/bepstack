import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "@/core/app";
import { db } from "@/core/db";
import { expectSuccess, expectToBeDefined } from "@/shared/utils/tests.utils";

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

const testComment = {
	body: "Thank you so much!",
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

	// Create an article to comment on
	const { data: articleData } = await api.articles.post(
		{ article: testArticle },
		{ headers: { Authorization: `Token ${authToken}` } },
	);
	articleSlug = articleData?.article?.slug ?? "";
});

afterAll(async () => {
	await db.$disconnect();
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
