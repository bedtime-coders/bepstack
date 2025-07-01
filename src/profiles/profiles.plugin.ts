import { Elysia, t } from "elysia";
import { StatusCodes } from "http-status-codes";
import { db } from "@/core/db";
import { RealWorldError } from "@/shared/errors";
import { auth } from "@/shared/plugins";
import { toResponse } from "./mappers";
import { profilesModel } from "./profiles.model";

export const profiles = new Elysia({ tags: ["Profiles"] })
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
					async ({ params: { username }, auth: { currentUserId } }) => {
						const profile = await db.user.findFirstOrThrow({
							where: { username },
						});
						const following = Boolean(
							await db.user.findFirst({
								where: {
									id: currentUserId,
									following: { some: { id: profile.id } },
								},
							}),
						);
						return toResponse(profile, following);
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
					async ({ params: { username }, auth: { currentUserId } }) => {
						const user = await db.user.findFirstOrThrow({
							where: { username },
						});
						// TODO: Make this a db constraint
						if (user.id === currentUserId) {
							throw new RealWorldError(StatusCodes.UNPROCESSABLE_ENTITY, {
								profile: ["cannot be followed by yourself"],
							});
						}
						await db.user.update({
							where: { id: currentUserId },
							data: { following: { connect: { id: user.id } } },
						});
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
					async ({ params: { username }, auth: { currentUserId } }) => {
						const user = await db.user.findFirstOrThrow({
							where: { username },
						});
						// TODO: Make this a db constraint
						if (user.id === currentUserId) {
							throw new RealWorldError(StatusCodes.UNPROCESSABLE_ENTITY, {
								profile: ["cannot be unfollowed by yourself"],
							});
						}
						await db.user.update({
							where: { id: currentUserId },
							data: { following: { disconnect: { id: user.id } } },
						});
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
