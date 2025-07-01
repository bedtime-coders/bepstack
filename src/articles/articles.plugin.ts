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
						tag: tagName,
						author: authorUsername,
						favorited: favoritedByUsername,
						limit = DEFAULT_LIMIT,
						offset = DEFAULT_OFFSET,
					},
					auth: { currentUserId },
				}) => {
					const enrichedArticles = await db.article.findMany({
						where: {
							...(authorUsername && {
								author: {
									username: authorUsername,
								},
							}),
							...(favoritedByUsername && {
								favorites: {
									some: {
										user: {
											username: favoritedByUsername,
										},
									},
								},
							}),
							...(tagName && {
								tags: {
									some: {
										name: tagName,
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
					return toArticlesResponse(enrichedArticles, { currentUserId });
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
					const enrichedArticle = await db.article.findFirstOrThrow({
						where: { slug },
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
							_count: {
								select: { favorites: true },
							},
						},
					});
					return toResponse(enrichedArticle, { currentUserId });
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
					const enrichedArticles = await db.article.findMany({
						where: {
							author: {
								followers: {
									some: {
										followerId: currentUserId,
									},
								},
							},
						},
						orderBy: { createdAt: "desc" },
						skip: offset,
						take: limit,
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
							_count: {
								select: { favorites: true },
							},
						},
					});
					return toArticlesResponse(enrichedArticles, { currentUserId });
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
					const createdArticle = await db.article.create({
						data: {
							slug: slugify(article.title),
							title: article.title,
							description: article.description,
							body: article.body,
							authorId: currentUserId,
							tags: {
								connectOrCreate: article.tagList?.map((name) => ({
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
							_count: {
								select: { favorites: true },
							},
						},
					});

					return toResponse(createdArticle, {
						currentUserId,
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

					const updatedArticle = await db.article.update({
						where: { id: existingArticle.id },
						data: {
							...article,
							slug: newSlug,
							tags: {
								connectOrCreate: article.tagList?.map((name) => ({
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
							_count: {
								select: { favorites: true },
							},
						},
					});
					return toResponse(updatedArticle, {
						currentUserId,
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
					// 1. Fetch everything in one go
					const article = await db.article.findFirstOrThrow({
						where: { slug },
						include: {
							author: {
								include: {
									followers: {
										where: { followerId: currentUserId },
									},
								},
							},
							tags: true,
							favorites: {
								where: { userId: currentUserId },
							},
							_count: {
								select: { favorites: true },
							},
						},
					});

					// 2. Only upsert if not already favorited
					if (article.favorites.length > 0) {
						return toResponse(article, {
							currentUserId,
						});
					}

					await db.favorite.upsert({
						where: {
							userId_articleId: {
								userId: currentUserId,
								articleId: article.id,
							},
						},
						update: {},
						create: {
							userId: currentUserId,
							articleId: article.id,
						},
					});

					return toResponse(article, {
						currentUserId,
						favorited: true,
						favoritesCount: article._count.favorites + 1,
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
					// 1. Fetch everything in one go
					const existingArticle = await db.article.findFirstOrThrow({
						where: { slug },
						include: {
							author: {
								include: {
									followers: {
										where: { followerId: currentUserId },
									},
								},
							},
							tags: true,
							favorites: {
								where: {
									userId: currentUserId,
								},
							},
							_count: {
								select: { favorites: true },
							},
						},
					});

					if (existingArticle.favorites.length === 0) {
						return toResponse(existingArticle, { currentUserId });
					}

					// 2. Delete the favorite
					await db.favorite.delete({
						where: {
							userId_articleId: {
								userId: currentUserId,
								articleId: existingArticle.id,
							},
						},
					});

					return toResponse(existingArticle, {
						currentUserId,
						favorited: false,
						favoritesCount: existingArticle._count.favorites - 1,
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
