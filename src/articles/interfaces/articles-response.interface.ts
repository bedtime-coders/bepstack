export interface ArticlesResponse {
	articles: Array<{
		slug: string;
		title: string;
		description: string;
		tagList: string[];
		createdAt: string;
		updatedAt: string;
		favorited: boolean;
		favoritesCount: number;
		author: {
			username: string;
			bio: string | null;
			image: string | null;
			following: boolean;
		};
	}>;
	articlesCount: number;
}
