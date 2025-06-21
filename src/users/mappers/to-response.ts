import type { InferSelectModel } from "drizzle-orm";
import type { SignFn } from "@/shared/plugins";
import type { ModelsStatic } from "@/shared/types/elysia";
import type { usersModel } from "../users.model";
import type { users } from "../users.schema";

/**
 * Map a user to a response
 * @param user The user to map
 * @param sign The function to sign the user
 * @returns The mapped user
 */
export const toResponse = async (
	user: InferSelectModel<typeof users>,
	sign: SignFn,
): Promise<ModelsStatic<typeof usersModel.models>["User"]> => {
	const { email, username, bio, image } = user;
	return {
		user: {
			token: await sign({ uid: user.id, email, username }),
			email,
			username,
			bio,
			image,
		},
	};
};
