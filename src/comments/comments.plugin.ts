import { Elysia, NotFoundError, t } from "elysia";
import { StatusCodes } from "http-status-codes";
import { db } from "@/core/db";
import { RealWorldError } from "@/shared/errors";
import { auth } from "@/shared/plugins";
import { CUID, commentsModel } from "./comments.model";
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
				async ({ params: { slug }, auth: { currentUserId } }) => {
					const article = await db.article.findFirstOrThrow({
						where: { slug },
					});

					const comments = await db.comment.findMany({
						where: { articleId: article.id },
						orderBy: {
							createdAt: "desc",
						},
						include: {
							author: true,
						},
					});

					return toCommentsResponse(comments, currentUserId);
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
					auth: { currentUserId },
				}) => {
					const article = await db.article.findFirstOrThrow({
						where: { slug },
					});

					const createdComment = await db.comment.create({
						data: {
							body: comment.body,
							articleId: article.id,
							authorId: currentUserId,
						},
						include: {
							author: true,
						},
					});

					return toCommentResponse(createdComment, false);
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
				async ({ params: { slug, id }, auth: { currentUserId }, set }) => {
					const article = await db.article.findFirstOrThrow({
						where: { slug },
					});

					// Verify comment exists and user owns it
					const existingComment = await db.comment.findFirstOrThrow({
						where: { id },
					});

					if (existingComment.articleId !== article.id) {
						throw new NotFoundError("comment");
					}

					if (existingComment.authorId !== currentUserId) {
						throw new RealWorldError(StatusCodes.FORBIDDEN, {
							comment: ["you can only delete your own comments"],
						});
					}

					await db.comment.delete({
						where: { id },
					});

					set.status = StatusCodes.NO_CONTENT;
				},
				{
					detail: {
						summary: "Delete a Comment for an Article",
						description: "Delete a comment for an article. Auth is required",
					},
					params: t.Object({ id: CUID, slug: t.String() }),
					response: {
						[StatusCodes.NO_CONTENT]: t.Void(),
					},
				},
			),
	);
