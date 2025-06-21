import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { articles } from "@/articles/articles.schema";
import { users } from "@/users/users.schema";

export const comments = pgTable(
	"comments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		body: text("body").notNull(),
		articleId: uuid("article_id")
			.notNull()
			.references(() => articles.id, { onDelete: "cascade" }),
		authorId: uuid("author_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at")
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("comments_article_id_idx").on(table.articleId),
		index("comments_author_id_idx").on(table.authorId),
		index("comments_created_at_idx").on(table.createdAt),
	],
);

// Relations
export const commentsRelations = relations(comments, ({ one }) => ({
	article: one(articles, {
		fields: [comments.articleId],
		references: [articles.id],
	}),
	author: one(users, {
		fields: [comments.authorId],
		references: [users.id],
	}),
}));
