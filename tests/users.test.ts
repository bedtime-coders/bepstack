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
});

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

		const login = await api.users.login.post({
			user: { email: updatedEmail, password: testUser.password },
		});
		authToken = login.data?.user?.token ?? "";

		const login2 = await api.users.login.post({
			user: { email: testUser2.email, password: testUser2.password },
		});
		authToken2 = login2.data?.user?.token ?? "";

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
		const res = await api.users.post({
			user: newUser3,
		});
		expectSuccess(res);
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
