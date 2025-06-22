import { and, count, eq, type InferSelectModel } from "drizzle-orm";
import { db } from "@/core/drizzle";
import { follows } from "@/profiles/profiles.schema";
import type { tags } from "@/tags/tags.schema";
import type { users } from "@/users/users.schema";
import { type articles, favorites } from "../articles.schema";
import type { EnrichedArticle } from "../interfaces";

/**
 * Map an article to a response
 * @param article The article to map
 * @param currentUserId The current user's ID. If provided, the article will be mapped to the current user's perspective.
 * @returns The mapped article
 */
export async function toResponse(
	article: EnrichedArticle,
	currentUserId?: string | null,
): Promise<{
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
}> {
	const [favoritesCount] = await db
		.select({ count: count() })
		.from(favorites)
		.where(eq(favorites.articleId, article.id));

	let favorited = false;
	if (currentUserId) {
		const [favorite] = await db
			.select()
			.from(favorites)
			.where(
				and(
					eq(favorites.articleId, article.id),
					eq(favorites.userId, currentUserId),
				),
			);
		favorited = Boolean(favorite);
	}

	let following = false;
	if (currentUserId && currentUserId !== article.author.id) {
		const [follow] = await db
			.select()
			.from(follows)
			.where(
				and(
					eq(follows.followerId, currentUserId),
					eq(follows.followingId, article.author.id),
				),
			);
		following = Boolean(follow);
	}

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
			favoritesCount: Number(favoritesCount?.count || 0),
			author: {
				username: article.author.username,
				bio: article.author.bio,
				image: article.author.image,
				following,
			},
		},
	};
}
