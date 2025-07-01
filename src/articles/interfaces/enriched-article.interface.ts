import type { Article, Favorite, Follow, Tag, User } from "@prisma/client";

export type EnrichedArticle = Article & {
	author: User & {
		followers: Follow[];
	};
	tags: Tag[];
	favorites: Favorite[];
};
