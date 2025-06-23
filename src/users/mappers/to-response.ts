import type { User } from "@prisma/client";
import type { SignFn } from "@/shared/plugins";
import type { ModelsStatic } from "@/shared/types/elysia";
import type { usersModel } from "../users.model";

/**
 * Map a user to a response
 * @param user The user to map
 * @param sign The function to sign the user
 * @returns The mapped user
 */
export const toResponse = async (
	{ email, username, bio, image, id }: User,
	sign: SignFn,
): Promise<ModelsStatic<typeof usersModel.models>["User"]> => ({
	user: {
		token: await sign({ uid: id, email, username }),
		email,
		username,
		bio,
		image,
	},
});
