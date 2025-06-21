import { Elysia, t } from "elysia";
import { db } from "@/core/db";

export const tags = new Elysia({
	tags: ["Tags"],
}).get(
	"/tags",
	async () => {
		const allTags = await db.query.tags.findMany();
		return {
			tags: allTags.map((tag) => tag.name),
		};
	},
	{
		detail: {
			summary: "Get Tags",
			description: "Returns a list of all tags. No authentication required.",
			response: t.Object({
				tags: t.Array(t.String(), {
					examples: [["reactjs", "angularjs", "dragons"]],
				}),
			}),
		},
	},
);
