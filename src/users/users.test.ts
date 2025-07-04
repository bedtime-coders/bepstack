import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "@/core/app";
import {
	expectError,
	expectNoError,
	expectSuccess,
	registerAndLoginUser,
} from "@/tests/utils";

const { api } = treaty(app);

const testUser = {
	email: "users_test@test.com",
	username: "users_test_user",
	password: "Password123",
};

const testUser2 = {
	email: "celeb_users@test.com",
	username: "celeb_users_user",
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

let authToken: string;
let authToken2: string;

// Register users for tests
beforeEach(async () => {
	authToken = await registerAndLoginUser(testUser);
	authToken2 = await registerAndLoginUser(testUser2);
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

		expectNoError(error);
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

		expectNoError(error);
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

		expectNoError(error);
		expect(data?.user).toBeDefined();
		expect(data?.user.email).toBe(testUser2.email);
		expect(data?.user.username).toBe(testUser2.username);
		expect(data?.user).toHaveProperty("bio");
		expect(data?.user).toHaveProperty("image");
		expect(data?.user).toHaveProperty("token");

		const token = data?.user?.token;
		expect(token).toBeDefined();

		const { data: userData, error: userError } = await api.user.get({
			headers: { Authorization: `Token ${token}` },
		});
		expectNoError(userError);
		expect(userData?.user.email).toBe(testUser2.email);
	});

	it("should get current user", async () => {
		const { data, error } = await api.user.get({
			headers: {
				Authorization: `Token ${authToken}`,
			},
		});

		expectNoError(error);
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

		expectNoError(error);
		expect(data?.user.email).toBe(updatedEmail);
		expect(data?.user).toHaveProperty("username");
		expect(data?.user).toHaveProperty("bio");
		expect(data?.user).toHaveProperty("image");
		expect(data?.user).toHaveProperty("token");

		// Get updated token for the user with new email
		const login = await api.users.login.post({
			user: { email: updatedEmail, password: testUser.password },
		});
		const updatedAuthToken = login.data?.user?.token ?? "";

		// Refresh second user's token
		const login2 = await api.users.login.post({
			user: { email: testUser2.email, password: testUser2.password },
		});
		authToken2 = login2.data?.user?.token ?? "";

		const { data: user1Data, error: user1Error } = await api.user.get({
			headers: { Authorization: `Token ${updatedAuthToken}` },
		});
		expectNoError(user1Error);
		expect(user1Data?.user.email).toBe(updatedEmail);

		const { data: user2Data, error: user2Error } = await api.user.get({
			headers: { Authorization: `Token ${authToken2}` },
		});
		expectNoError(user2Error);
		expect(user2Data?.user.email).toBe(testUser2.email);
	});

	it("should not register user with missing fields", async () => {
		const { data, error } = await api.users.post({
			user: { email: "", password: "", username: "" },
		});
		expectError(error);
		expect(data).toBeNull();
	});

	it("should not register user with duplicate email", async () => {
		const res = await api.users.post({
			user: newUser3,
		});
		expectSuccess(res);
		const res2 = await api.users.post({
			user: { ...newUser4, email: newUser3.email },
		});
		expectError(res2.error);
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
		expectError(error);
		expect(data).toBeNull();
	});

	it("should not login with wrong password", async () => {
		const { data, error } = await api.users.login.post({
			user: { email: testUser.email, password: "wrongpassword" },
		});
		expectError(error);
		expect(data).toBeNull();
	});

	it("should not login with missing fields", async () => {
		const { data, error } = await api.users.login.post({
			user: { email: "", password: "" },
		});
		expectError(error);
		expect(data).toBeNull();
	});
});
