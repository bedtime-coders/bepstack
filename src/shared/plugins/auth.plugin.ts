import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { StatusCodes } from "http-status-codes";
import { db } from "@/core/drizzle";
import { env } from "@/core/env";
import { RealWorldError } from "@/shared/errors";
import { users } from "@/users/users.schema";
import { name } from "../../../package.json";
import jwt from "./jwt.plugin";
import { token } from "./token.plugin";

const JwtPayload = t.Object({
	uid: t.String(),
	email: t.String(),
	username: t.String(),
});

type JwtPayload = typeof JwtPayload.static;

export type SignFn = (payload: JwtPayload) => Promise<string>;

export const auth = new Elysia()
	.use(
		jwt({
			secret: env.JWT_SECRET,
			exp: "24h",
			iss: name,
			schema: JwtPayload,
		}),
	)
	.use(token())
	.derive({ as: "global" }, async ({ jwt, token }) => {
		const jwtPayload = await jwt.verify(token);
		return {
			auth: {
				sign: ((jwtPayload) =>
					jwt.sign({
						...jwtPayload,
						iat: Math.floor(Date.now() / 1000),
					})) satisfies SignFn,
				jwtPayload: jwtPayload || null,
				currentUserId: jwtPayload ? jwtPayload.uid : null,
			},
		};
	})
	.macro({
		auth: {
			async resolve({ jwt, token, auth }) {
				if (!token) {
					throw new RealWorldError(StatusCodes.UNAUTHORIZED, {
						token: [
							"is required. Please provide an Authorization header in the form: 'Token <token>'",
						],
					});
				}
				const jwtPayload = await jwt.verify(token);
				if (!jwtPayload) {
					throw new RealWorldError(StatusCodes.UNAUTHORIZED, {
						token: ["is invalid, expired, or malformed"],
					});
				}

				// Check user exists in DB
				const user = await db.query.users.findFirst({
					where: eq(users.id, jwtPayload.uid),
				});
				if (!user) {
					throw new RealWorldError(StatusCodes.UNAUTHORIZED, {
						token: ["belongs to a non-existent user"],
					});
				}

				const currentUserId = jwtPayload.uid;

				return { auth: { ...auth, jwtPayload, currentUserId } };
			},
		},
	});
