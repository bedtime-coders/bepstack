import type { EnrichedArticle } from "../interfaces";

/**
 * Parameters for the toResponse function
 */
type ToResponseParams = {
	/**
	 * The current user's ID. If provided, the article will be mapped to the current user's perspective.
	 */
	currentUserId?: string;
	/**
	 * The favorited status for the current user. If provided, the article will be mapped to the current user's perspective.
	 */
	favorited?: boolean;
	/**
	 * The favorites count for the current user. If provided, the article will be mapped to the current user's perspective.
	 */
	favoritesCount?: number;
};

/**
 * Map an article to a response
 * @param article The article to map
 * @param params The parameters to map the article
 * @returns The mapped article
 */
export function toResponse(
	article: EnrichedArticle,
	{
		currentUserId,
		favorited: favoritedParam,
		favoritesCount: favoritesCountParam,
	}: ToResponseParams = {},
): {
	article: {
		slug: string;
		title: string;
		description: string;
		body: string;
		tagList: string[];
		createdAt: string;
		updatedAt: string;
		favorited: boolean;
		favoritesCount: number;
		author: {
			username: string;
			bio: string | null;
			image: string | null;
			following: boolean;
		};
	};
} {
	const favorited =
		favoritedParam ?? article.favoritedBy?.some((f) => f.id === currentUserId);
	const favoritesCount =
		favoritesCountParam ??
		article._count?.favoritedBy ??
		article.favoritedBy.length;
	const following = article.author.followedBy?.some(
		(f) => f.id === currentUserId,
	);

	return {
		article: {
			slug: article.slug,
			title: article.title,
			description: article.description,
			body: article.body,
			tagList: article.tags
				.map((t) => t.name)
				.sort((a, b) => a.localeCompare(b)),
			createdAt: article.createdAt.toISOString(),
			updatedAt: article.updatedAt.toISOString(),
			favorited: favorited ?? false,
			favoritesCount: favoritesCount ?? 0,
			author: {
				username: article.author.username,
				bio: article.author.bio,
				image: article.author.image,
				following: following ?? false,
			},
		},
	};
}
