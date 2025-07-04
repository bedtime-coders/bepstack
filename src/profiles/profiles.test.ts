import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "@/core/app";
import { expectNoError, registerAndLoginUser } from "@/tests/utils";

// Create type-safe API client with Eden Treaty
const { api } = treaty(app);

// Test data
const testUser = {
	email: "profiles_test@test.com",
	username: "profiles_test_user",
	password: "Password123",
};

const testUser2 = {
	email: "celeb_profiles@test.com",
	username: "celeb_profiles_user",
	password: "Password123",
};

let authToken: string;

// Register users for profile tests
beforeEach(async () => {
	authToken = await registerAndLoginUser(testUser);
	await registerAndLoginUser(testUser2);
});

describe("Profile Tests", () => {
	it("should get profile", async () => {
		const { data, error } = await api
			.profiles({ username: testUser2.username })
			.get();

		expectNoError(error);
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

		expectNoError(error);
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
		expectNoError(error);
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
