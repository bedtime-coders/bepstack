import { eq } from "drizzle-orm";
import { Elysia, NotFoundError, t } from "elysia";
import { StatusCodes } from "http-status-codes";
import { articles } from "@/articles/articles.schema";
import { db } from "@/core/drizzle";
import { RealWorldError } from "@/shared/errors";
import { auth } from "@/shared/plugins";
import { commentsModel, UUID } from "./comments.model";
import { comments } from "./comments.schema";
import { toCommentResponse, toCommentsResponse } from "./mappers";

export const commentsPlugin = new Elysia({
	tags: ["Comments"],
})
	.use(auth)
	.use(commentsModel)
	.group("/articles/:slug/comments", (app) =>
		app
			.get(
				"/",
				async ({ params: { slug }, auth: { jwtPayload } }) => {
					// Verify article exists
					const article = await db.query.articles.findFirst({
						where: eq(articles.slug, slug),
					});

					if (!article) {
						throw new NotFoundError("article");
					}

					// Get comments for the article
					const commentsWithAuthors = await db.query.comments.findMany({
						where: eq(comments.articleId, article.id),
						with: {
							author: true,
						},
						orderBy: (comments, { desc }) => [desc(comments.createdAt)],
					});

					return toCommentsResponse(commentsWithAuthors, jwtPayload?.uid);
				},
				{
					detail: {
						summary: "Get Comments from an Article",
						description: "Get the comments for of an article. Auth is optional",
					},
					response: "CommentsResponse",
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
				"/",
				async ({
					params: { slug },
					body: { comment },
					auth: { jwtPayload },
				}) => {
					// Verify article exists
					const article = await db.query.articles.findFirst({
						where: eq(articles.slug, slug),
					});

					if (!article) {
						throw new NotFoundError("article");
					}

					// Create comment
					const [createdComment] = await db
						.insert(comments)
						.values({
							body: comment.body,
							articleId: article.id,
							authorId: jwtPayload.uid,
						})
						.returning();

					if (!createdComment) {
						throw new RealWorldError(StatusCodes.INTERNAL_SERVER_ERROR, {
							comment: ["failed to create"],
						});
					}

					// Get comment with author
					const commentWithAuthor = await db.query.comments.findFirst({
						where: eq(comments.id, createdComment.id),
						with: {
							author: true,
						},
					});

					if (!commentWithAuthor) {
						throw new NotFoundError("comment");
					}

					return toCommentResponse(commentWithAuthor, jwtPayload.uid);
				},
				{
					detail: {
						summary: "Create a Comment for an Article",
						description: "Create a comment for an article. Auth is required",
					},
					body: "CreateComment",
					response: "CommentResponse",
				},
			)
			.delete(
				"/:id",
				async ({ params: { slug, id }, auth: { jwtPayload }, set }) => {
					// Verify article exists
					const article = await db.query.articles.findFirst({
						where: eq(articles.slug, slug),
					});

					if (!article) {
						throw new NotFoundError("article");
					}

					// Verify comment exists and user owns it
					const existingComment = await db.query.comments.findFirst({
						where: eq(comments.id, id),
					});

					if (!existingComment) {
						throw new NotFoundError("comment");
					}

					if (existingComment.articleId !== article.id) {
						throw new NotFoundError("comment");
					}

					if (existingComment.authorId !== jwtPayload.uid) {
						throw new RealWorldError(StatusCodes.FORBIDDEN, {
							comment: ["you can only delete your own comments"],
						});
					}

					// Delete comment
					await db.delete(comments).where(eq(comments.id, id));

					set.status = StatusCodes.NO_CONTENT;
				},
				{
					detail: {
						summary: "Delete a Comment for an Article",
						description: "Delete a comment for an article. Auth is required",
					},
					params: t.Object({ id: UUID, slug: t.String() }),
					response: {
						[StatusCodes.NO_CONTENT]: t.Void(),
					},
				},
			),
	);
