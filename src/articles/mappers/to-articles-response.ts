import type { ArticlesResponse, ArticlesWithData } from "../interfaces";

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
	favoritesCounts: { articleId: string; count: number }[];
}

/**
 * Map an array of articles to a response
 * @param articlesWithData The articles to map
 * @param extras The extras to map, see {@link Extras}
 * @returns The mapped articles
 */
export async function toArticlesResponse(
	articlesWithData: ArticlesWithData,
	extras: Extras = {
		userFavorites: [],
		followStatus: [],
		favoritesCounts: [],
	},
): Promise<ArticlesResponse> {
	const { userFavorites, followStatus, favoritesCounts } = extras;
	return {
		articlesCount: articlesWithData.length,
		articles: articlesWithData.map((article) => {
			const favoritesCount =
				favoritesCounts.find((fc) => fc.articleId === article.id)?.count ?? 0;
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
				tagList: article.tags.sort((a, b) => a.localeCompare(b)),
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
