import { Elysia, t } from "elysia";

// UUID type using regex (RFC 4122)
export const UUID = t.String({
	examples: ["818119a0-9c3b-4116-87d4-4bf4b4e1a2f8"],
	format: "uuid",
	description: "must be a valid UUID v4 string",
});

export const CreateComment = t.Object({
	comment: t.Object({
		body: t.String({
			minLength: 1,
			examples: ["His name was my name too."],
		}),
	}),
});

export const Comment = t.Object({
	id: UUID,
	createdAt: t.String({
		format: "date-time",
		examples: ["2016-02-18T03:22:56.637Z"],
	}),
	updatedAt: t.String({
		format: "date-time",
		examples: ["2016-02-18T03:22:56.637Z"],
	}),
	body: t.String({
		examples: ["It takes a Jacobian"],
	}),
	author: t.Object({
		username: t.String({
			examples: ["jake"],
		}),
		bio: t.Union([t.String({ examples: ["I work at statefarm"] }), t.Null()]),
		image: t.Union([
			t.String({ examples: ["https://i.stack.imgur.com/xHWG8.jpg"] }),
			t.Null(),
		]),
		following: t.Boolean({
			examples: [false],
		}),
	}),
});

export const CommentsResponse = t.Object({
	comments: t.Array(Comment),
});

export const CommentResponse = t.Object({
	comment: Comment,
});

// Path parameter model for id
export const CommentIdParam = t.Object({
	id: UUID,
});

export const commentsModel = new Elysia().model({
	CreateComment,
	Comment,
	CommentsResponse,
	CommentResponse,
	CommentIdParam,
});
