import { Elysia, t } from "elysia";

const CreateUser = t.Object({
	user: t.Object({
		email: t.String({
			format: "email",
			examples: ["jake@jake.jake"],
		}),
		password: t.String({
			minLength: 8,
			maxLength: 100,
			pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$",
			description:
				"must be at least 8 characters and contain uppercase, lowercase, and numbers",
			examples: ["hunter2A"],
		}),
		username: t.String({ minLength: 2, examples: ["jake"] }),
		bio: t.Optional(
			t.String({
				minLength: 2,
				examples: ["I work at statefarm"],
			}),
		),
		image: t.Optional(
			t.String({
				format: "uri",
				examples: ["https://api.realworld.io/images/smiley-cyrus.jpg"],
			}),
		),
	}),
});

export const usersModel = new Elysia().model({
	LoginUser: t.Object({
		user: t.Object({
			email: t.String({
				format: "email",
				minLength: 1,
				examples: ["jake@jake.jake"],
			}),
			password: t.String({
				minLength: 1,
				examples: ["hunter2A"],
			}),
		}),
	}),
	CreateUser,
	User: t.Object({
		user: t.Object({
			email: t.String({
				examples: ["jake@jake.jake"],
			}),
			token: t.String({
				examples: [
					"eyJhbGciOiJIUzI1NiJ9.eyJpc3N1ZXIiOiJiZWRzdGFjay1zdHJpcHBlZCIsImlkIjoxMiwiZW1haWwiOiJqYWtlQGpha2UuamFrZTIiLCJ1c2VybmFtZSI6Impha2UyIiwiaWF0IjoxNzUwMDE2MDU0fQ.j_2URjoIZ6yJtpfNh21g4tvLdejCjcY-ot_7fq3wwTM",
				],
			}),
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
		}),
	}),
	UpdateUser: t.Object({
		user: t.Partial(CreateUser.properties.user),
	}),
});
