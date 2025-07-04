import { Elysia } from "elysia";
import { articlesPlugin as articles } from "@/articles/articles.plugin";
import { commentsPlugin as comments } from "@/comments/comments.plugin";
import { profiles } from "@/profiles/profiles.plugin";
import { tags } from "@/tags/tags.controller";
import { usersPlugin as users } from "@/users/users.controller";
import { errors, openapi } from "./plugins";
import { health } from "./plugins/health.plugin";

export const app = new Elysia()
	.use(errors)
	.use(openapi)
	.group("/api", (app) =>
		app
			.use(users)
			.use(profiles)
			.use(articles)
			.use(comments)
			.use(tags)
			.use(health),
	);
