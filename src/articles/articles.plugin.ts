import { Elysia, t } from "elysia";
import { StatusCodes } from "http-status-codes";
import { db } from "@/core/db";
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from "@/shared/constants";
import { RealWorldError } from "@/shared/errors";
import { auth } from "@/shared/plugins";
import { slugify } from "@/shared/utils";
import { ArticleQuery, articlesModel, FeedQuery } from "./articles.model";
import { toArticlesResponse, toResponse } from "./mappers";

export const articlesPlugin = new Elysia({
	tags: ["Articles"],
})
	.use(auth)
	.use(articlesModel)
	.group("/articles", (app) =>
		app
			.get(
				"/",
				async ({
					query: {
						tag,
						author: authorUsername,
						favorited: favoritedByUsername,
						limit = DEFAULT_LIMIT,
						offset = DEFAULT_OFFSET,
					},
					auth: { currentUserId },
				}) => {
					const [authorUser, favoritedUser] = await Promise.all([
						authorUsername
							? db.user.findFirst({ where: { username: authorUsername } })
							: undefined,
						favoritedByUsername
							? db.user.findFirst({ where: { username: favoritedByUsername } })
							: undefined,
					]);

					if (
						(authorUsername && !authorUser) ||
						(favoritedByUsername && !favoritedUser)
					) {
						return toArticlesResponse([]);
					}

					const articles = await db.article.findMany({
						where: {
							...(authorUser && {
								authorId: authorUser.id,
							}),
							...(favoritedUser && {
								favorites: {
									some: {
										userId: favoritedUser.id,
									},
								},
							}),
							...(tag && {
								tags: {
									some: {
										name: tag,
									},
								},
							}),
						},
						orderBy: {
							createdAt: "desc",
						},
						skip: offset,
						take: limit,
						include: {
							author: true,
							tags: true,
						},
					});

					if (articles.length === 0) return toArticlesResponse([]);
					if (!currentUserId) {
						return toArticlesResponse(articles);
					}

					const articleIds = articles.map((a) => a.id);
					const authorIds = articles.map((a) => a.author.id);

					// Step 3: Load extras (favorited, favorites count, following) - batched
					const [favoritesCounts, userFavorites, followStatus] =
						await Promise.all([
							db.favorite.groupBy({
								by: ["articleId"],
								where: {
									articleId: {
										in: articleIds,
									},
								},
								_count: true,
							}),
							db.favorite.findMany({
								where: {
									userId: currentUserId,
									articleId: {
										in: articleIds,
									},
								},
								select: {
									articleId: true,
								},
							}),
							db.follow.findMany({
								where: {
									followerId: currentUserId,
									followingId: {
										in: authorIds,
									},
								},
								select: {
									followingId: true,
								},
							}),
						]);

					return toArticlesResponse(articles, {
						userFavorites,
						followStatus,
						favoritesCounts,
					});
				},
				{
					detail: {
						summary: "List Articles",
						description:
							"Returns most recent articles globally by default, provide tag, author or favorited query parameter to filter results",
					},
					query: ArticleQuery,
					response: "ArticlesResponse",
				},
			)
			.get(
				"/:slug",
				async ({ params: { slug }, auth: { currentUserId } }) => {
					if (!currentUserId) {
						const enrichedArticle = await db.article.findFirstOrThrow({
							where: {
								slug,
							},
							include: {
								author: true,
								tags: true,
							},
						});

						return toResponse(enrichedArticle, {
							favorited: false,
							favoritesCount: 0,
							following: false,
						});
					}

					const enrichedArticle = await db.article.findFirstOrThrow({
						where: {
							slug,
						},
						include: {
							author: {
								include: {
									followers: {
										where: {
											followerId: currentUserId,
										},
									},
								},
							},
							tags: true,
							favorites: {
								where: {
									userId: currentUserId,
								},
							},
						},
					});
					return toResponse(enrichedArticle, {
						favorited: enrichedArticle.favorites.length > 0,
						favoritesCount: enrichedArticle.favorites.length,
						following: enrichedArticle.author.followers.length > 0,
					});
				},
				{
					detail: {
						summary: "Get Article",
						description:
							"No authentication required, will return single article",
					},
					response: "Article",
				},
			)
			.guard({
				auth: true,
				detail: {
					security: [{ tokenAuth: [] }],
					description: "Authentication required",
				},
			})
			.get(
				"/feed",
				async ({
					query: { limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET },
					auth: { currentUserId },
				}) => {
					// Step 1: Get followed user IDs
					const followed = await db.follow.findMany({
						where: {
							followerId: currentUserId,
						},
						select: {
							followingId: true,
						},
					});

					const followedIds = followed.map((f) => f.followingId);
					if (followedIds.length === 0) return toArticlesResponse([]);

					// Step 2: Get articles from followed authors
					const articles = await db.article.findMany({
						where: {
							authorId: { in: followedIds },
						},
						orderBy: { createdAt: "desc" },
						skip: offset,
						take: limit,
						include: {
							author: true,
							tags: true,
						},
					});
					if (articles.length === 0) return toArticlesResponse([]);

					const articleIds = articles.map((a) => a.id);
					const authorIds = articles.map((a) => a.author.id);

					// Step 3: Get favorites count, user favorited, follow status
					const [favoritesCounts, userFavorites, followStatus] =
						await Promise.all([
							db.favorite.groupBy({
								by: ["articleId"],
								where: {
									articleId: {
										in: articleIds,
									},
								},
								_count: true,
							}),
							db.favorite.findMany({
								where: {
									userId: currentUserId,
									articleId: {
										in: articleIds,
									},
								},
								select: {
									articleId: true,
								},
							}),
							db.follow.findMany({
								where: {
									followerId: currentUserId,
									followingId: {
										in: authorIds,
									},
								},
								select: {
									followingId: true,
								},
							}),
						]);
					return toArticlesResponse(articles, {
						userFavorites,
						followStatus,
						favoritesCounts,
					});
				},
				{
					detail: {
						summary: "Feed Articles",
						description:
							"Can also take limit and offset query parameters like List Articles. Authentication required, will return multiple articles created by followed users, ordered by most recent first.",
					},
					query: FeedQuery,
					response: "ArticlesResponse",
				},
			)
			.post(
				"/",
				async ({ body: { article }, auth: { currentUserId } }) => {
					const slug = slugify(article.title);

					// Upsert tags
					const tagList = article.tagList ?? [];
					const tags = await Promise.all(
						tagList.map(async (name) =>
							db.tag.upsert({
								where: { name },
								update: {},
								create: { name },
							}),
						),
					);

					const createdArticle = await db.article.create({
						data: {
							slug,
							title: article.title,
							description: article.description,
							body: article.body,
							authorId: currentUserId,
							tags: {
								connectOrCreate: tags.map((tag) => ({
									where: { id: tag.id },
									create: { name: tag.name },
								})),
							},
						},
						include: {
							author: true,
							tags: true,
						},
					});

					return toResponse(createdArticle, {
						favorited: false,
						favoritesCount: 0,
						following: false, // you can't follow yourself
					});
				},
				{
					detail: {
						summary: "Create Article",
						description: "Authentication required, will return an Article",
					},
					body: "CreateArticle",
					response: "Article",
				},
			)
			.put(
				"/:slug",
				async ({
					params: { slug },
					body: { article },
					auth: { currentUserId },
				}) => {
					const existingArticle = await db.article.findFirstOrThrow({
						where: { slug },
					});

					if (existingArticle.authorId !== currentUserId) {
						throw new RealWorldError(StatusCodes.FORBIDDEN, {
							article: ["you can only update your own articles"],
						});
					}

					const newSlug =
						article.title && article.title !== existingArticle.title
							? slugify(article.title)
							: existingArticle.slug;

					const tagList = article.tagList ?? [];

					const updatedArticle = await db.article.update({
						where: { id: existingArticle.id },
						data: {
							...article,
							slug: newSlug,
							tags: {
								connectOrCreate: tagList.map((name) => ({
									where: { name },
									create: { name },
								})),
							},
						},
						include: {
							author: {
								include: {
									followers: true,
								},
							},
							tags: true,
							favorites: {
								where: {
									userId: currentUserId,
								},
							},
						},
					});
					return toResponse(updatedArticle, {
						favorited: updatedArticle.favorites.length > 0,
						favoritesCount: updatedArticle.favorites.length,
						following: updatedArticle.author.followers.length > 0,
					});
				},
				{
					detail: {
						summary: "Update Article",
						description:
							"Authentication required, returns the updated Article. The slug also gets updated when the title is changed.",
					},
					body: "UpdateArticle",
					response: "Article",
				},
			)
			.delete(
				"/:slug",
				async ({ params: { slug }, auth: { currentUserId }, set }) => {
					const existingArticle = await db.article.findFirstOrThrow({
						where: { slug },
					});

					if (existingArticle.authorId !== currentUserId) {
						throw new RealWorldError(StatusCodes.FORBIDDEN, {
							article: ["you can only delete your own articles"],
						});
					}

					await db.article.delete({
						where: { id: existingArticle.id },
					});

					set.status = StatusCodes.NO_CONTENT;
				},
				{
					detail: {
						summary: "Delete Article",
					},
					response: t.Void({
						description: "No content",
					}),
				},
			)
			.guard({
				auth: true,
				detail: {
					security: [{ tokenAuth: [] }],
					description: "Authentication required",
				},
			})
			.post(
				"/:slug/favorite",
				async ({ params: { slug }, auth: { currentUserId } }) => {
					// Verify article exists
					const existingArticle = await db.article.findFirstOrThrow({
						where: { slug },
						include: {
							author: true,
							tags: true,
							favorites: true,
						},
					});

					if (existingArticle.authorId !== currentUserId) {
						throw new RealWorldError(StatusCodes.FORBIDDEN, {
							article: ["you can only favorite your own articles"],
						});
					}

					await db.favorite.upsert({
						where: {
							userId_articleId: {
								userId: currentUserId,
								articleId: existingArticle.id,
							},
						},
						update: {},
						create: {
							userId: currentUserId,
							articleId: existingArticle.id,
						},
					});

					let favoritesCount = existingArticle.favorites.length;
					// if you didn't favorite it before, increment the count
					if (
						!existingArticle.favorites.some((f) => f.userId === currentUserId)
					) {
						favoritesCount++;
					}

					return toResponse(existingArticle, {
						favorited: true,
						favoritesCount,
						following: false, // you can't follow yourself
					});
				},
				{
					detail: {
						summary: "Favorite Article",
						description: "Authentication required, returns the Article",
					},
					response: "Article",
				},
			)
			.delete(
				"/:slug/favorite",
				async ({ params: { slug }, auth: { currentUserId } }) => {
					// Verify article exists
					const existingArticle = await db.article.findFirstOrThrow({
						where: { slug },
						include: {
							author: true,
							tags: true,
							favorites: true,
						},
					});

					if (existingArticle.authorId !== currentUserId) {
						throw new RealWorldError(StatusCodes.FORBIDDEN, {
							article: ["you can only unfavorite your own articles"],
						});
					}

					await db.favorite.delete({
						where: {
							userId_articleId: {
								userId: currentUserId,
								articleId: existingArticle.id,
							},
						},
					});

					let favoritesCount = existingArticle.favorites.length;
					// if you did favorite it before, decrement the count
					if (
						existingArticle.favorites.some((f) => f.userId === currentUserId)
					) {
						favoritesCount--;
					}

					return toResponse(existingArticle, {
						favorited: false,
						favoritesCount,
						following: false, // you can't follow yourself
					});
				},
				{
					detail: {
						summary: "Unfavorite Article",
						description: "Authentication required, returns the Article",
					},
					response: "Article",
				},
			),
	);
