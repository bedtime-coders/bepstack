import { drizzle } from "drizzle-orm/bun-sql";
import {
	articles,
	articlesRelations,
	favorites,
	favoritesRelations,
} from "@/articles/articles.schema";
import { comments, commentsRelations } from "@/comments/comments.schema";
import { follows } from "@/profiles/profiles.schema";
import {
	articleTags,
	articleTagsRelations,
	tags,
	tagsRelations,
} from "@/tags/tags.schema";
import { users } from "@/users/users.schema";
import { env } from "./env";

export const db = drizzle(env.DATABASE_URL, {
	schema: {
		users,
		follows,
		articles,
		tags,
		articleTags,
		favorites,
		comments,
		articlesRelations,
		tagsRelations,
		articleTagsRelations,
		favoritesRelations,
		commentsRelations,
	},
	logger: env.LOG_LEVEL === "debug",
});
