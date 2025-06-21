import { and, eq } from "drizzle-orm";
import { Elysia, NotFoundError, t } from "elysia";
import { StatusCodes } from "http-status-codes";
import { db } from "@/core/db";
import { RealWorldError } from "@/shared/errors";
import { auth } from "@/shared/plugins";
import { users } from "@/users/users.schema";
import { toResponse } from "./mappers";
import { profilesModel } from "./profiles.model";
import { follows } from "./profiles.schema";

export const profiles = new Elysia({
	tags: ["Profiles"],
})
	.use(auth)
	.use(profilesModel)
	.group(
		"/profiles",
		{
			params: t.Object({
				username: t.String({
					examples: ["jake"],
				}),
			}),
		},
		(app) =>
			app
				.get(
					"/:username",
					async ({ params: { username }, auth: { jwtPayload } }) => {
						const user = await db.query.users.findFirst({
							where: eq(users.username, username),
						});
						if (!user) throw new NotFoundError("profile");

						let following = false;
						if (jwtPayload) {
							const follow = await db.query.follows.findFirst({
								where: and(
									eq(follows.followerId, jwtPayload.uid),
									eq(follows.followingId, user.id),
								),
							});
							following = Boolean(follow);
						}
						return toResponse(user, following);
					},
					{
						detail: {
							summary: "Get Profile",
							description:
								"Authentication optional, returns a [Profile](docs#model/profile)",
						},
						response: "Profile",
					},
				)
				.guard({
					auth: true,
					detail: {
						security: [{ tokenAuth: [] }],
						description: "Authentication required",
					},
				})
				.post(
					"/:username/follow",
					async ({ params: { username }, auth: { jwtPayload } }) => {
						const user = await db.query.users.findFirst({
							where: eq(users.username, username),
						});
						if (!user) throw new NotFoundError("profile");
						if (user.id === jwtPayload.uid) {
							throw new RealWorldError(StatusCodes.UNPROCESSABLE_ENTITY, {
								profile: ["cannot be followed by yourself"],
							});
						}
						await db
							.insert(follows)
							.values({
								followerId: jwtPayload.uid,
								followingId: user.id,
							})
							.onConflictDoNothing();
						return toResponse(user, true);
					},
					{
						detail: {
							summary: "Follow user",
							description:
								"Authentication required, returns a [Profile](docs#model/profile)",
						},
						response: "Profile",
					},
				)
				.delete(
					"/:username/follow",
					async ({ params: { username }, auth: { jwtPayload } }) => {
						const user = await db.query.users.findFirst({
							where: eq(users.username, username),
						});
						if (!user) throw new NotFoundError("profile");
						if (user.id === jwtPayload.uid) {
							throw new RealWorldError(StatusCodes.UNPROCESSABLE_ENTITY, {
								profile: ["cannot be unfollowed by yourself"],
							});
						}
						await db
							.delete(follows)
							.where(
								and(
									eq(follows.followerId, jwtPayload.uid),
									eq(follows.followingId, user.id),
								),
							);
						return toResponse(user, false);
					},
					{
						detail: {
							summary: "Unfollow user",
							description:
								"Authentication required, returns a [Profile](docs#model/profile)",
						},
						response: "Profile",
					},
				),
	);
