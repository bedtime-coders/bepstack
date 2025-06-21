import { and, eq, type InferSelectModel, inArray } from "drizzle-orm";
import { db } from "@/core/db";
import { follows } from "@/profiles/profiles.schema";
import type { users } from "@/users/users.schema";
import type { comments } from "../comments.schema";

/**
 * Map a comment to a response
 * @param comment The comment to map
 * @param currentUserId The current user's ID. If provided, the comment will be mapped to the current user's perspective.
 * @param followingStatus Optional pre-fetched following status for the comment author
 * @returns The mapped comment
 */
export async function toCommentResponse(
	comment: InferSelectModel<typeof comments> & {
		author: InferSelectModel<typeof users>;
	},
	currentUserId?: string,
	followingStatus?: boolean,
): Promise<{
	comment: {
		id: string;
		createdAt: string;
		updatedAt: string;
		body: string;
		author: {
			username: string;
			bio: string | null;
			image: string | null;
			following: boolean;
		};
	};
}> {
	let following = false;

	// Use pre-fetched following status if available
	if (followingStatus !== undefined) {
		following = followingStatus;
	} else if (currentUserId && currentUserId !== comment.author.id) {
		// Fallback to individual query if pre-fetched data not available
		try {
			const [follow] = await db
				.select()
				.from(follows)
				.where(
					and(
						eq(follows.followerId, currentUserId),
						eq(follows.followingId, comment.author.id),
					),
				);
			following = Boolean(follow);
		} catch (error) {
			console.error("Error checking follow relationship:", error);
			// Set safe default value to prevent operation failure
			following = false;
		}
	}

	return {
		comment: {
			id: comment.id,
			createdAt: comment.createdAt.toISOString(),
			updatedAt: comment.updatedAt.toISOString(),
			body: comment.body,
			author: {
				username: comment.author.username,
				bio: comment.author.bio,
				image: comment.author.image,
				following,
			},
		},
	};
}

/**
 * Map an array of comments to a response
 * @param commentsWithAuthors The comments to map
 * @param currentUserId The current user's ID. If provided, the comments will be mapped to the current user's perspective.
 * @returns The mapped comments
 */
export async function toCommentsResponse(
	commentsWithAuthors: Array<
		InferSelectModel<typeof comments> & {
			author: InferSelectModel<typeof users>;
		}
	>,
	currentUserId?: string,
): Promise<{
	comments: Array<{
		id: string;
		createdAt: string;
		updatedAt: string;
		body: string;
		author: {
			username: string;
			bio: string | null;
			image: string | null;
			following: boolean;
		};
	}>;
}> {
	// Batch fetch all following relationships in a single query
	let followingStatus: Record<string, boolean> = {};

	if (currentUserId) {
		try {
			const authorIds = commentsWithAuthors.map((comment) => comment.author.id);
			const uniqueAuthorIds = [...new Set(authorIds)];

			if (uniqueAuthorIds.length > 0) {
				const followRelationships = await db
					.select({ followingId: follows.followingId })
					.from(follows)
					.where(
						and(
							eq(follows.followerId, currentUserId),
							inArray(follows.followingId, uniqueAuthorIds),
						),
					);

				// Create a map of author ID to following status
				followingStatus = followRelationships.reduce(
					(acc, relation) => {
						acc[relation.followingId] = true;
						return acc;
					},
					{} as Record<string, boolean>,
				);
			}
		} catch (error) {
			console.error("Error batch fetching follow relationships:", error);
			// Continue with empty following status map
		}
	}

	// Map comments using pre-fetched following status
	const comments = await Promise.all(
		commentsWithAuthors.map(async (comment) => {
			const following = followingStatus[comment.author.id] || false;
			const response = await toCommentResponse(
				comment,
				currentUserId,
				following,
			);
			return response.comment;
		}),
	);

	return {
		comments,
	};
}
