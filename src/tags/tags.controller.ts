import { Elysia, t } from "elysia";
import * as TagsService from "./tags.service";

export const tags = new Elysia({
	tags: ["Tags"],
}).get(
	"/tags",
	async () => {
		const tags = await TagsService.findAll();
		return { tags };
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
