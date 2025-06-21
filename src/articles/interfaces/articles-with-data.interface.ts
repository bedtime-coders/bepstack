import type { InferSelectModel } from "drizzle-orm";
import type { users } from "@/users/users.schema";
import type { articles } from "../articles.schema";

export type ArticlesWithData = Array<
	Omit<InferSelectModel<typeof articles>, "authorId"> & {
		author: InferSelectModel<typeof users>;
		tags: string[];
	}
>;
