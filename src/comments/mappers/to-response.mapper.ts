import type { Comment, Follow, User } from "@prisma/client";

/**
 * Parameters for the toCommentResponse function
 */
type ToCommentResponseParams = {
	/**
	 * The current user's ID. If provided, the comment will be mapped to the current user's perspective.
	 */
	currentUserId?: string | null;
};

/**
 * Map a comment to a response
 * @param enrichedComment The comment to map
 * @param currentUserId The current user's ID. If provided, the comment will be mapped to the current user's perspective.
 * @param followingStatus Optional pre-fetched following status for the comment author
 * @returns The mapped comment
 */
export const toCommentResponse = (
	enrichedComment: Comment & {
		author: User & {
			followers?: Follow[];
		};
	},
	{ currentUserId }: ToCommentResponseParams = {},
): {
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
} => {
	let following = false;

	if (currentUserId && enrichedComment.author.followers) {
		following = enrichedComment.author.followers.some(
			(follower) => follower.followerId === currentUserId,
		);
	}

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
};

type ToCommentsResponseParams = Pick<ToCommentResponseParams, "currentUserId">;

/**
 * Map an array of comments to a response
 * @param commentsWithAuthors The comments to map
 * @param currentUserId The current user's ID. If provided, the comments will be mapped to the current user's perspective.
 * @returns The mapped comments
 */
export function toCommentsResponse(
	commentsWithAuthors: Array<
		Comment & {
			author: User & {
				followers?: Follow[];
			};
		}
	>,
	{ currentUserId }: ToCommentsResponseParams = {},
): {
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
} {
	const comments = commentsWithAuthors.map((comment) => {
		const response = toCommentResponse(comment, { currentUserId });
		return response.comment;
	});

	return {
		comments,
	};
}
