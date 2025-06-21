import { Elysia, t } from "elysia";

export const profilesModel = new Elysia().model({
	Profile: t.Object({
		profile: t.Object({
			username: t.String({
				examples: ["jake"],
			}),
			bio: t.Union([t.String({ examples: ["I work at statefarm"] }), t.Null()]),
			image: t.Union([
				t.String({
					examples: ["https://api.realworld.io/images/smiley-cyrus.jpg"],
				}),
				t.Null(),
			]),
			following: t.Boolean({
				examples: [false],
			}),
		}),
	}),
});
