import { afterAll, beforeAll } from "bun:test";
import { disconnectDb, registerAndLoginUser, resetDb } from "./utils";

const testUser = {
	email: "test@test.com",
	username: "testuser",
	password: "Password123",
};

export let authToken: string;

beforeAll(async () => {
	await resetDb();
	authToken = await registerAndLoginUser(testUser);
});

afterAll(async () => {
	await disconnectDb();
});
