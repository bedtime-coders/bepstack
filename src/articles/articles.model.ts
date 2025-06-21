import { Elysia, t } from "elysia";

export const ArticleQuery = t.Object({
	tag: t.Optional(t.String({ examples: ["angularjs"] })),
	author: t.Optional(t.String({ examples: ["jake"] })),
	favorited: t.Optional(t.String({ examples: ["jake"] })),
	limit: t.Optional(t.Number({ minimum: 1, maximum: 100, examples: [20] })),
	offset: t.Optional(t.Number({ minimum: 0, examples: [0] })),
});
export const FeedQuery = t.Object({
	limit: t.Optional(t.Number({ minimum: 1, maximum: 100, examples: [20] })),
	offset: t.Optional(t.Number({ minimum: 0, examples: [0] })),
});

export const Author = t.Object({
	username: t.String({
		examples: ["jake"],
	}),
	bio: t.Union([t.String({ examples: ["I work at statefarm"] }), t.Null()]),
	image: t.Union([
		t.String({
			examples: ["https://i.stack.imgur.com/xHWG8.jpg"],
		}),
		t.Null(),
	]),
	following: t.Boolean({
		examples: [false],
	}),
});

const ArticleBase = t.Object({
	slug: t.String({
		examples: ["how-to-train-your-dragon"],
	}),
	title: t.String({
		examples: ["How to train your dragon"],
	}),
	description: t.String({
		examples: ["Ever wonder how?"],
	}),
	tagList: t.Array(t.String(), {
		examples: [["dragons", "training"]],
	}),
	createdAt: t.String({
		format: "date-time",
		examples: ["2016-02-18T03:22:56.637Z"],
	}),
	updatedAt: t.String({
		format: "date-time",
		examples: ["2016-02-18T03:48:35.824Z"],
	}),
	favorited: t.Boolean({
		examples: [false],
	}),
	favoritesCount: t.Number({
		examples: [0],
	}),
	author: Author,
});

export const articlesModel = new Elysia().model({
	CreateArticle: t.Object({
		article: t.Object({
			title: t.String({
				minLength: 1,
				examples: ["How to train your dragon"],
			}),
			description: t.String({
				minLength: 1,
				examples: ["Ever wonder how?"],
			}),
			body: t.String({
				minLength: 1,
				examples: ["You have to believe"],
			}),
			tagList: t.Optional(
				t.Array(t.String(), {
					examples: [["reactjs", "angularjs", "dragons"]],
				}),
			),
		}),
	}),
	UpdateArticle: t.Object({
		article: t.Object({
			title: t.Optional(
				t.String({
					minLength: 1,
					examples: ["Did you train your dragon?"],
				}),
			),
			description: t.Optional(
				t.String({
					minLength: 1,
					examples: ["Ever wonder how?"],
				}),
			),
			body: t.Optional(
				t.String({
					minLength: 1,
					examples: ["You have to believe"],
				}),
			),
			tagList: t.Optional(
				t.Array(t.String(), {
					examples: [["reactjs", "angularjs", "dragons"]],
				}),
			),
		}),
	}),
	Article: t.Object({
		article: t.Intersect([
			ArticleBase,
			t.Object({
				body: t.String({
					examples: ["It takes a Jacobian"],
				}),
			}),
		]),
	}),
	ArticleListItem: t.Object({
		article: ArticleBase,
	}),
	ArticlesResponse: t.Object({
		articles: t.Array(ArticleBase),
		articlesCount: t.Number({
			examples: [2],
		}),
	}),
});
