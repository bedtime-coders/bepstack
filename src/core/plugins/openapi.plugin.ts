import { openapi as openapiPlugin } from "@bedtime-coders/elysia-openapi";
import { staticPlugin } from "@elysiajs/static";
import { Elysia } from "elysia";
import { description, title } from "../../../package.json";

const path = "/docs";

export const openapi = new Elysia()
	.use(staticPlugin())
	.use(
		openapiPlugin({
			documentation: {
				info: { title, version: "", description },
				components: {
					securitySchemes: {
						tokenAuth: {
							type: "apiKey",
							description:
								'Prefix the token with "Token ", e.g. "Token jwt.token.here"',
							in: "header",
							name: "Authorization",
						},
					},
				},
			},
			exclude: ["/"],
			scalarVersion: "1.31.10",
			path,
			scalarConfig: {
				favicon: "/public/icon-dark.svg",
				persistAuth: true,
			},
		}),
	)
	.get("/", ({ redirect }) => redirect(path));
