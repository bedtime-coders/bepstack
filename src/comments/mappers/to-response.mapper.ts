import type { Comment, User } from "@prisma/client";
import { and, eq, type InferSelectModel, inArray } from "drizzle-orm";
import { db } from "@/core/drizzle";
import { follows } from "@/profiles/profiles.schema";
import type { users } from "@/users/users.schema";

/**
 * Map a comment to a response
 * @param enrichedComment The comment to map
 * @param currentUserId The current user's ID. If provided, the comment will be mapped to the current user's perspective.
 * @param followingStatus Optional pre-fetched following status for the comment author
 * @returns The mapped comment
 */
export async function toCommentResponse(
	enrichedComment: Comment & {
		author: User;
	},
	following: boolean,
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
	return {
		comment: {
			id: enrichedComment.id,
			createdAt: enrichedComment.createdAt.toISOString(),
			updatedAt: enrichedComment.updatedAt.toISOString(),
			body: enrichedComment.body,
			author: {
				username: enrichedComment.author.username,
				bio: enrichedComment.author.bio,
				image: enrichedComment.author.image,
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
	currentUserId?: string | null,
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
