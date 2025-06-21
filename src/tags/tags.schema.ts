import { relations } from "drizzle-orm";
import { index, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { articles } from "@/articles/articles.schema";

export const tags = pgTable(
	"tags",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull().unique(),
	},
	(table) => [index("tags_name_idx").on(table.name)],
);

export const articleTags = pgTable(
	"article_tags",
	{
		articleId: uuid("article_id")
			.notNull()
			.references(() => articles.id, { onDelete: "cascade" }),
		tagId: uuid("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.articleId, table.tagId] }),
		index("article_tags_article_id_idx").on(table.articleId),
		index("article_tags_tag_id_idx").on(table.tagId),
	],
);

export const tagsRelations = relations(tags, ({ many }) => ({
	articleTags: many(articleTags),
}));

export const articleTagsRelations = relations(articleTags, ({ one }) => ({
	article: one(articles, {
		fields: [articleTags.articleId],
		references: [articles.id],
	}),
	tag: one(tags, {
		fields: [articleTags.tagId],
		references: [tags.id],
	}),
}));
