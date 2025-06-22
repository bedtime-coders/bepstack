import type { Article, Tag, User } from "@prisma/client";

export type EnrichedArticle = Article & {
	author: User;
	tags: Tag[];
};
