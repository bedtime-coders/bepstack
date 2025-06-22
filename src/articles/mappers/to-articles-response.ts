import type { ArticlesResponse, EnrichedArticle } from "../interfaces";

/**
 * The extras to map
 */
interface Extras {
	/**
	 * The user's favorites
	 */
	userFavorites: { articleId: string }[];
	/**
	 * The user's follow status
	 */
	followStatus: { followingId: string }[];
	/**
	 * The favorites counts
	 */
	favoritesCounts: { articleId: string; _count: number }[];
}

/**
 * Map an array of articles to a response
 * @param enrichedArticles The articles to map, each article is enriched with the user's favorites, follow status, and favorites count
 * @param extras The extras to map, see {@link Extras}
 * @returns The mapped articles
 */
export async function toArticlesResponse(
	enrichedArticles: EnrichedArticle[],
	extras: Extras = {
		userFavorites: [],
		followStatus: [],
		favoritesCounts: [],
	},
): Promise<ArticlesResponse> {
	const { userFavorites, followStatus, favoritesCounts } = extras;
	return {
		articlesCount: enrichedArticles.length,
		articles: enrichedArticles.map((article) => {
			const favoritesCount =
				favoritesCounts.find((fc) => fc.articleId === article.id)?._count ?? 0;
			const isFavorited = userFavorites.some(
				(fav) => fav.articleId === article.id,
			);
			const isFollowing = followStatus.some(
				(follow) => follow.followingId === article.author.id,
			);
			return {
				slug: article.slug,
				title: article.title,
				description: article.description,
				tagList: article.tags
					.map((t) => t.name)
					.sort((a, b) => a.localeCompare(b)),
				createdAt: article.createdAt.toISOString(),
				updatedAt: article.updatedAt.toISOString(),
				favorited: isFavorited,
				favoritesCount,
				author: {
					username: article.author.username,
					bio: article.author.bio,
					image: article.author.image,
					following: isFollowing,
				},
			};
		}),
	};
}
