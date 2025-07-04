import { beforeEach } from "bun:test";
import { resetDb } from "./utils";

beforeEach(async () => {
	await resetDb();
});
