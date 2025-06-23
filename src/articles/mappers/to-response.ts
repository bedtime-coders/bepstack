import type { EnrichedArticle } from "../interfaces";

type ToResponseParams = {
	/**
	 * Whether the article is favorited
	 */
	favorited: boolean;
	/**
	 * The number of favorites
	 */
	favoritesCount: number;
	/**
	 * Whether the current user is following the article author
	 */
	following: boolean;
};

/**
 * Map an article to a response
 * @param article The article to map
 * @param params The parameters to map the article
 * @returns The mapped article
 */
export function toResponse(
	article: EnrichedArticle,
	{ favorited, favoritesCount, following }: ToResponseParams,
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
			favorited,
			favoritesCount,
			author: {
				username: article.author.username,
				bio: article.author.bio,
				image: article.author.image,
				following,
			},
		},
	};
}
