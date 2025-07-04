import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "@/core/app";
import { db } from "@/core/db";
import { expectSuccess, expectToBeDefined } from "@/shared/utils/tests.utils";

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

let authToken: string;
let authToken2: string;

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

describe("Profile Tests", () => {
	afterAll(async () => {
		await db.$disconnect();
	});

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
