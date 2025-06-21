import { Elysia } from "elysia";

export interface TokenOptions {
	/**
	 * If the API doesn't compliant with RFC6750
	 * The key for extracting the token is configurable
	 */
	extract: {
		/**
		 * Determine which fields to be identified as Token token
		 *
		 * @default access_token
		 */
		body?: string;
		/**
		 * Determine which fields to be identified as Token token
		 *
		 * @default access_token
		 */
		query?: string;
		/**
		 * Determine which type of Authentication should be Token token
		 *
		 * @default Token
		 */
		header?: string;
	};
}

export const token = (
	{
		extract: {
			body = "access_token",
			query: queryName = "access_token",
			header = "Token",
		} = {
			body: "access_token",
			query: "access_token",
			header: "Token",
		},
	}: TokenOptions = {
		extract: {
			body: "access_token",
			query: "access_token",
			header: "Token",
		},
	},
) =>
	new Elysia({
		name: "ElysiaJS token plugin",
		seed: {
			body,
			query: queryName,
			header,
		},
	}).derive(
		{ as: "global" },
		function deriveToken({ query, headers: { authorization } }) {
			const prefix = `${header} `;
			return {
				get token() {
					if ((authorization as string)?.startsWith(prefix))
						return (authorization as string).slice(prefix.length);

					const q = query[queryName];

					if (Array.isArray(q) && q.length > 0 && typeof q[0] === "string")
						return q[0];
					if (q) return q;
					return undefined;
				},
			};
		},
	);
