import { and, count, desc, eq, inArray } from "drizzle-orm";
import { Elysia, NotFoundError } from "elysia";
import { StatusCodes } from "http-status-codes";
import { omit, sift } from "radashi";
import { db } from "@/core/db";
import { follows } from "@/profiles/profiles.schema";
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from "@/shared/constants";
import { RealWorldError } from "@/shared/errors";
import { auth } from "@/shared/plugins";
import { slugify } from "@/shared/utils";
import { articleTags, tags } from "@/tags/tags.schema";
import { users } from "@/users/users.schema";
import { ArticleQuery, articlesModel, FeedQuery } from "./articles.model";
import { articles, favorites } from "./articles.schema";
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
					auth: { jwtPayload },
				}) => {
					const currentUserId = jwtPayload?.uid;

					// Preload filter IDs using relational API
					const [authorUser, favoritedUser] = await Promise.all([
						authorUsername
							? db.query.users.findFirst({
									where: eq(users.username, authorUsername),
								})
							: undefined,
						favoritedByUsername
							? db.query.users.findFirst({
									where: eq(users.username, favoritedByUsername),
								})
							: undefined,
					]);

					if (
						(authorUsername && !authorUser) ||
						(favoritedByUsername && !favoritedUser)
					) {
						return toArticlesResponse([]);
					}

					// Step 1: Fetch article IDs using a relational-aware filter
					const filteredArticleIds = await db
						.select({ id: articles.id })
						.from(articles)
						.leftJoin(articleTags, eq(articleTags.articleId, articles.id))
						.leftJoin(tags, eq(tags.id, articleTags.tagId))
						.leftJoin(favorites, eq(favorites.articleId, articles.id))
						.where(
							and(
								authorUser ? eq(articles.authorId, authorUser.id) : undefined,
								favoritedUser
									? eq(favorites.userId, favoritedUser.id)
									: undefined,
								tag ? eq(tags.name, tag) : undefined,
							),
						)
						.groupBy(articles.id)
						.orderBy(desc(articles.createdAt))
						.limit(limit)
						.offset(offset);

					const articleIds = filteredArticleIds.map((a) => a.id);
					if (articleIds.length === 0) return toArticlesResponse([]);

					// Step 2: Use relational API to fetch articles with nested joins
					const articlesWithNestedData = await db.query.articles.findMany({
						where: inArray(articles.id, articleIds),
						with: {
							author: true,
							tags: {
								with: {
									tag: true,
								},
							},
						},
					});

					const articlesWithData = articlesWithNestedData.map((article) => ({
						...omit(article, ["authorId"]),
						author: article.author,
						tags: article.tags.map((t) => t.tag.name),
					}));

					const authorIds = articlesWithData.map((a) => a.author.id);

					// Step 3: Load extras (favorited, favorites count, following) - batched
					const [favoritesCounts, userFavorites, followStatus] =
						await Promise.all([
							db
								.select({
									articleId: favorites.articleId,
									count: count().as("count"),
								})
								.from(favorites)
								.where(inArray(favorites.articleId, articleIds))
								.groupBy(favorites.articleId),
							currentUserId
								? db.query.favorites.findMany({
										columns: { articleId: true },
										where: and(
											eq(favorites.userId, currentUserId),
											inArray(favorites.articleId, articleIds),
										),
									})
								: [],
							currentUserId
								? db.query.follows.findMany({
										columns: { followingId: true },
										where: and(
											eq(follows.followerId, currentUserId),
											inArray(follows.followingId, authorIds),
										),
									})
								: [],
						]);

					return toArticlesResponse(articlesWithData, {
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
				async ({ params: { slug }, auth: { jwtPayload } }) => {
					const articleWithData = await db.query.articles.findFirst({
						where: eq(articles.slug, slug),
						with: {
							author: true,
							tags: {
								with: {
									tag: true,
								},
							},
						},
					});

					if (!articleWithData) {
						throw new NotFoundError("article");
					}

					return toResponse(articleWithData, jwtPayload?.uid);
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
					auth: { jwtPayload },
				}) => {
					const currentUserId = jwtPayload.uid;

					// Step 1: Get followed user IDs
					const followed = await db
						.select({ followingId: follows.followingId })
						.from(follows)
						.where(eq(follows.followerId, currentUserId));

					const followedIds = followed.map((f) => f.followingId);
					if (followedIds.length === 0) return toArticlesResponse([]);

					// Step 2: Get article IDs from followed authors
					const articleIdsResult = await db
						.select({ id: articles.id })
						.from(articles)
						.where(inArray(articles.authorId, followedIds))
						.orderBy(desc(articles.createdAt))
						.limit(limit)
						.offset(offset);

					const articleIds = articleIdsResult.map((a) => a.id);
					if (articleIds.length === 0) return toArticlesResponse([]);

					// Step 3: Get full article data with author and tags
					const articlesWithNestedData = await db.query.articles.findMany({
						where: inArray(articles.id, articleIds),
						with: {
							author: true,
							tags: {
								with: {
									tag: true,
								},
							},
						},
					});

					const articlesWithData = articlesWithNestedData.map((article) => ({
						...omit(article, ["authorId"]),
						author: article.author,
						tags: article.tags.map((t) => t.tag.name),
					}));

					const authorIds = articlesWithData.map((a) => a.author.id);

					// Step 4: Get favorites count, user favorited, follow status
					const [favoritesCounts, userFavorites, followStatus] =
						await Promise.all([
							db
								.select({
									articleId: favorites.articleId,
									count: count().as("count"),
								})
								.from(favorites)
								.where(inArray(favorites.articleId, articleIds))
								.groupBy(favorites.articleId),
							db.query.favorites.findMany({
								columns: { articleId: true },
								where: and(
									eq(favorites.userId, currentUserId),
									inArray(favorites.articleId, articleIds),
								),
							}),
							db.query.follows.findMany({
								columns: { followingId: true },
								where: and(
									eq(follows.followerId, currentUserId),
									inArray(follows.followingId, authorIds),
								),
							}),
						]);

					return toArticlesResponse(articlesWithData, {
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
				async ({ body: { article }, auth: { jwtPayload } }) => {
					const slug = slugify(article.title);

					// Create article
					const [createdArticle] = await db
						.insert(articles)
						.values({
							slug,
							title: article.title,
							description: article.description,
							body: article.body,
							authorId: jwtPayload.uid,
						})
						.returning();

					if (!createdArticle) {
						throw new RealWorldError(StatusCodes.INTERNAL_SERVER_ERROR, {
							article: ["failed to create"],
						});
					}

					// Handle tags
					if (article.tagList && article.tagList.length > 0) {
						// Create or get existing tags
						const tagPromises = article.tagList.map(async (tagName) => {
							try {
								const existingTag = await db.query.tags.findFirst({
									where: eq(tags.name, tagName),
								});
								if (existingTag) {
									return existingTag;
								}

								const [newTag] = await db
									.insert(tags)
									.values({ name: tagName })
									.returning();

								if (!newTag) {
									console.error(
										"Unexpected error: Could not create tag",
										tagName,
									);
									return null;
								}
								return newTag;
							} catch (error) {
								console.error(`Failed to create tag "${tagName}":`, error);
								return null;
							}
						});

						const createdTags = sift(await Promise.all(tagPromises));

						await db.insert(articleTags).values(
							createdTags.map((tag) => ({
								articleId: createdArticle.id,
								tagId: tag.id,
							})),
						);
					}

					// Get article with author and tags
					const articleWithData = await db.query.articles.findFirst({
						where: eq(articles.id, createdArticle.id),
						with: {
							author: true,
							tags: {
								with: {
									tag: {
										columns: {
											id: true,
											name: true,
										},
									},
								},
							},
						},
					});

					if (!articleWithData) {
						throw new NotFoundError("article");
					}

					return toResponse(
						{
							...articleWithData,
							tags: articleWithData.tags,
						},
						jwtPayload.uid,
					);
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
					auth: { jwtPayload },
				}) => {
					// Check article exists and user owns it
					const existingArticle = await db.query.articles.findFirst({
						where: eq(articles.slug, slug),
					});

					if (!existingArticle) {
						throw new NotFoundError("article");
					}

					if (existingArticle.authorId !== jwtPayload.uid) {
						throw new RealWorldError(StatusCodes.FORBIDDEN, {
							article: ["you can only update your own articles"],
						});
					}

					// Generate new slug if title changed
					let newSlug = existingArticle.slug;
					if (article.title && article.title !== existingArticle.title) {
						newSlug = slugify(article.title);
					}

					// Update article

					const [updatedArticle] = await db
						.update(articles)
						.set({
							...article,
							slug: newSlug,
						})
						.where(eq(articles.id, existingArticle.id))
						.returning();

					if (!updatedArticle) {
						throw new RealWorldError(StatusCodes.INTERNAL_SERVER_ERROR, {
							article: ["failed to update"],
						});
					}

					// Handle tag updates
					if (article.tagList !== undefined) {
						// Remove existing tags
						await db
							.delete(articleTags)
							.where(eq(articleTags.articleId, existingArticle.id));

						// Add new tags
						if (article.tagList.length > 0) {
							const tagPromises = article.tagList.map(async (tagName) => {
								try {
									const existingTag = await db.query.tags.findFirst({
										where: eq(tags.name, tagName),
									});
									if (existingTag) {
										return existingTag;
									}

									const [newTag] = await db
										.insert(tags)
										.values({ name: tagName })
										.returning();

									if (!newTag) {
										console.error(
											"Unexpected error: Could not create tag",
											tagName,
										);
										return null;
									}
									return newTag;
								} catch (error) {
									console.error(`Failed to create tag "${tagName}":`, error);
									return null;
								}
							});

							const createdTags = sift(await Promise.all(tagPromises));

							await db.insert(articleTags).values(
								createdTags.map((tag) => ({
									articleId: existingArticle.id,
									tagId: tag.id,
								})),
							);
						}
					}

					// Get updated article with author and tags
					const articleWithData = await db.query.articles.findFirst({
						where: eq(articles.id, updatedArticle.id),
						with: {
							author: true,
							tags: {
								with: {
									tag: true,
								},
							},
						},
					});

					if (!articleWithData) {
						throw new NotFoundError("article");
					}

					return toResponse(articleWithData, jwtPayload.uid);
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
				async ({ params: { slug }, auth: { jwtPayload } }) => {
					// Check article exists and user owns it
					const existingArticle = await db.query.articles.findFirst({
						where: eq(articles.slug, slug),
					});

					if (!existingArticle) {
						throw new NotFoundError("article");
					}

					if (existingArticle.authorId !== jwtPayload.uid) {
						throw new RealWorldError(StatusCodes.FORBIDDEN, {
							article: ["you can only delete your own articles"],
						});
					}

					// Delete article (cascade will handle related records)
					await db.delete(articles).where(eq(articles.id, existingArticle.id));

					return new Response(null, { status: StatusCodes.NO_CONTENT });
				},
				{
					detail: {
						summary: "Delete Article",
					},
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
				async ({ params: { slug }, auth: { jwtPayload } }) => {
					// Verify article exists
					const existingArticle = await db.query.articles.findFirst({
						where: eq(articles.slug, slug),
					});

					if (!existingArticle) {
						throw new NotFoundError("article");
					}

					// Check if already favorited
					const existingFavorite = await db.query.favorites.findFirst({
						where: and(
							eq(favorites.userId, jwtPayload.uid),
							eq(favorites.articleId, existingArticle.id),
						),
					});

					if (existingFavorite) {
						// Already favorited, return the article as-is
						const articleWithData = await db.query.articles.findFirst({
							where: eq(articles.id, existingArticle.id),
							with: {
								author: true,
								tags: {
									with: {
										tag: true,
									},
								},
							},
						});

						if (!articleWithData) {
							throw new NotFoundError("article");
						}

						return toResponse(articleWithData, jwtPayload.uid);
					}

					// Add to favorites
					await db.insert(favorites).values({
						userId: jwtPayload.uid,
						articleId: existingArticle.id,
					});

					// Get article with author and tags
					const articleWithData = await db.query.articles.findFirst({
						where: eq(articles.id, existingArticle.id),
						with: {
							author: true,
							tags: {
								with: {
									tag: true,
								},
							},
						},
					});

					if (!articleWithData) {
						throw new NotFoundError("article");
					}

					return toResponse(articleWithData, jwtPayload.uid);
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
				async ({ params: { slug }, auth: { jwtPayload } }) => {
					// Verify article exists
					const existingArticle = await db.query.articles.findFirst({
						where: eq(articles.slug, slug),
					});

					if (!existingArticle) {
						throw new NotFoundError("article");
					}

					// Remove from favorites
					await db
						.delete(favorites)
						.where(
							and(
								eq(favorites.userId, jwtPayload.uid),
								eq(favorites.articleId, existingArticle.id),
							),
						);

					// Get article with author and tags
					const articleWithData = await db.query.articles.findFirst({
						where: eq(articles.id, existingArticle.id),
						with: {
							author: true,
							tags: {
								with: {
									tag: true,
								},
							},
						},
					});

					if (!articleWithData) {
						throw new NotFoundError("article");
					}

					return toResponse(articleWithData, jwtPayload.uid);
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
