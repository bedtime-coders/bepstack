import { eq } from "drizzle-orm";
import { Elysia, NotFoundError } from "elysia";
import { StatusCodes } from "http-status-codes";
import { db } from "@/core/db";
import { assertNoConflicts, RealWorldError } from "@/shared/errors";
import { auth } from "@/shared/plugins";
import { toResponse } from "./mappers";
import { usersModel } from "./users.model";
import { users } from "./users.schema";

export const usersPlugin = new Elysia({
	tags: ["Auth"],
})
	.use(auth)
	.use(usersModel)
	.group("/users", (app) =>
		app
			.post(
				"/login",
				async ({ body: { user }, auth: { sign } }) => {
					const foundUser = await db.query.users.findFirst({
						where: eq(users.email, user.email),
					});
					if (!foundUser) {
						throw new NotFoundError("user");
					}
					if (!(await Bun.password.verify(user.password, foundUser.password))) {
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
				async ({ body: { user }, auth: { sign } }) => {
					await assertNoConflicts(
						"user",
						{
							email: user.email,
							username: user.username,
						},
						async (key, value) => {
							const existing = await db.query.users.findFirst({
								where: eq(users[key], value),
							});
							return Boolean(existing);
						},
					);
					const [createdUser] = await db
						.insert(users)
						.values({
							...user,
							password: await Bun.password.hash(user.password),
						})
						.onConflictDoNothing()
						.returning();
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
				async ({ auth: { sign, jwtPayload } }) => {
					const user = await db.query.users.findFirst({
						where: eq(users.id, jwtPayload.uid),
					});
					if (!user) {
						throw new NotFoundError("user");
					}
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
				async ({ body: { user }, auth: { sign, jwtPayload } }) => {
					await assertNoConflicts(
						"user",
						{
							email: user.email,
							username: user.username,
						},
						async (key, value) => {
							const existing = await db.query.users.findFirst({
								where: eq(users[key], value),
							});
							return Boolean(existing && existing.id !== jwtPayload.uid);
						},
					);
					const [updatedUser] = await db
						.update(users)
						.set({
							...user,
							password: user?.password
								? await Bun.password.hash(user.password)
								: undefined,
						})
						.where(eq(users.id, jwtPayload.uid))
						.returning();

					if (!updatedUser) {
						throw new RealWorldError(StatusCodes.INTERNAL_SERVER_ERROR, {
							user: ["failed to update"],
						});
					}
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
