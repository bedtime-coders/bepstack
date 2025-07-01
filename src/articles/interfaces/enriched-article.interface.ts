import type { Article, Tag, User } from "@prisma/client";

export type EnrichedArticle = Article & {
	author: User & {
		followedBy: User[];
	};
	tags: Tag[];
	favoritedBy: User[];
	_count?: {
		favoritedBy: number;
	};
};
