// Unit test for the app

import { describe, expect, it } from "bun:test";
import { StatusCodes } from "http-status-codes";
import { app } from "./app";

describe("Elysia", () => {
	it("returns a response", async () => {
		const status = await app
			.handle(new Request("http://localhost/api/health"))
			.then((res) => res.status);

		expect(status).toBe(StatusCodes.NO_CONTENT);
	});
});
