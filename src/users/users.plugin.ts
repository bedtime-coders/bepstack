import { Elysia } from "elysia";
import { StatusCodes } from "http-status-codes";
import { db } from "@/core/db";
import { env } from "@/core/plugins";
import { assertNoConflicts, RealWorldError } from "@/shared/errors";
import { auth } from "@/shared/plugins";
import { toResponse } from "./mappers";
import { usersModel } from "./users.model";

export const usersPlugin = new Elysia({ tags: ["Auth"] })
	.use(auth)
	.use(usersModel)
	.use(env)
	.group("/users", (app) =>
		app
			.post(
				"/login",
				async ({ body: { user }, auth: { sign }, env }) => {
					const foundUser = await db.user.findFirstOrThrow({
						where: { email: user.email },
					});
					if (
						!(await Bun.password.verify(
							user.password,
							foundUser.password,
							env.NODE_ENV === "development" ? "bcrypt" : "argon2id",
						))
					) {
						throw new RealWorldError(StatusCodes.UNAUTHORIZED, {
							user: ["invalid credentials"],
						});
					}
					return toResponse(foundUser, sign);
				},
				{
					detail: {
						summary: "Authentication",
						description:
							"No authentication required, returns a [User](docs#model/user)",
					},
					body: "LoginUser",
					response: "User",
				},
			)
			.post(
				"/",
				async ({ body: { user }, auth: { sign }, env }) => {
					await assertNoConflicts(
						"user",
						{
							email: user.email,
							username: user.username,
						},
						async (key, value) => {
							const existing = await db.user.findFirst({
								where: { [key]: value },
							});
							return Boolean(existing);
						},
					);
					const createdUser = await db.user.create({
						data: {
							...user,
							password: await Bun.password.hash(user.password, {
								algorithm:
									env.NODE_ENV === "development" ? "bcrypt" : "argon2id",
								cost: env.NODE_ENV === "development" ? 10 : undefined,
							}),
						},
					});
					if (!createdUser) {
						throw new RealWorldError(StatusCodes.INTERNAL_SERVER_ERROR, {
							user: ["failed to create"],
						});
					}
					return toResponse(createdUser, sign);
				},
				{
					detail: {
						summary: "Registration",
						description:
							"No authentication required, returns a [User](docs#model/user)",
					},
					body: "CreateUser",
					response: "User",
				},
			),
	)
	.group("/user", (app) =>
		app
			.get(
				"/",
				async ({ auth: { sign, currentUserId } }) => {
					const user = await db.user.findFirstOrThrow({
						where: { id: currentUserId },
					});
					return toResponse(user, sign);
				},
				{
					detail: {
						summary: "Get Current User",
						description:
							"Authentication required, returns a [User](docs#model/user) that's the current user",
						security: [{ tokenAuth: [] }],
					},
					response: "User",
					auth: true,
				},
			)
			.put(
				"/",
				async ({ body: { user }, auth: { sign, currentUserId }, env }) => {
					await assertNoConflicts(
						"user",
						{
							email: user.email,
							username: user.username,
						},
						async (key, value) => {
							const existing = await db.user.findFirst({
								where: { [key]: value },
							});
							return Boolean(existing && existing.id !== currentUserId);
						},
					);
					const updatedUser = await db.user.update({
						where: { id: currentUserId },
						data: {
							...user,
							password: user?.password
								? await Bun.password.hash(user.password, {
										algorithm:
											env.NODE_ENV === "development" ? "bcrypt" : "argon2id",
										cost: env.NODE_ENV === "development" ? 10 : undefined,
									})
								: undefined,
						},
					});
					return toResponse(updatedUser, sign);
				},
				{
					detail: {
						summary: "Update User",
						description:
							"Authentication required, returns the updated [User](docs#model/user)",
						security: [{ tokenAuth: [] }],
					},
					body: "UpdateUser",
					response: "User",
					auth: true,
				},
			),
	);
