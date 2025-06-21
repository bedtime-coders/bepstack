import { relations } from "drizzle-orm";
import {
	index,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { articleTags } from "@/tags/tags.schema";
import { users } from "@/users/users.schema";

export const articles = pgTable(
	"articles",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		slug: text("slug").notNull().unique(),
		title: text("title").notNull(),
		description: text("description").notNull(),
		body: text("body").notNull(),
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
		index("articles_slug_idx").on(table.slug),
		index("articles_author_id_idx").on(table.authorId),
		index("articles_created_at_idx").on(table.createdAt),
	],
);

export const favorites = pgTable(
	"favorites",
	{
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		articleId: uuid("article_id")
			.notNull()
			.references(() => articles.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.articleId] }),
		index("favorites_user_id_idx").on(table.userId),
		index("favorites_article_id_idx").on(table.articleId),
	],
);

export const articlesRelations = relations(articles, ({ one, many }) => ({
	author: one(users, {
		fields: [articles.authorId],
		references: [users.id],
	}),
	tags: many(articleTags),
	favorites: many(favorites),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
	user: one(users, {
		fields: [favorites.userId],
		references: [users.id],
	}),
	article: one(articles, {
		fields: [favorites.articleId],
		references: [articles.id],
	}),
}));
