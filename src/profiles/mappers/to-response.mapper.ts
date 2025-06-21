import type { InferSelectModel } from "drizzle-orm";
import type { users } from "src/users/users.schema";

/**
 * Map a user to a response
 * @param user The user to map
 * @param following Whether the user is following the current user
 * @returns The mapped user
 */
export const toResponse = (
	user: InferSelectModel<typeof users>,
	following: boolean,
) => {
	return {
		profile: {
			username: user.username,
			bio: user.bio,
			image: user.image,
			following,
		},
	};
};
