import { env as elysiaEnv } from "@yolk-oss/elysia-env";
import { t } from "elysia";

export const testEnvPlugin = elysiaEnv({
	APIURL: t.String({ default: "http://localhost:3000/api" }),
	USERNAME: t.String({ default: "jake" }),
	EMAIL: t.String({ default: "jake@jake.jake" }),
	PASSWORD: t.String({ default: "hunter2A" }),
	POSTMAN_COLLECTION: t.String({
		default:
			"https://raw.githubusercontent.com/gothinkster/realworld/refs/heads/main/api/Conduit.postman_collection.json",
	}),
	SKIP_DB_RESET: t.Boolean({ default: false }),
	DELAY_REQUEST: t.Number({ default: 50 }),
});

export const { env: testEnv } = testEnvPlugin.decorator;
