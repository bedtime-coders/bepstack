import { exit } from "node:process";
import { parseArgs } from "node:util";
import chalk from "chalk";
import { drizzle } from "drizzle-orm/bun-sql";
import { reset, seed } from "drizzle-seed";
import { draw } from "radashi";
import * as articlesSchema from "@/articles/articles.schema";
import { env } from "@/core/env";
import * as profilesSchema from "@/profiles/profiles.schema";
import * as tagsSchema from "@/tags/tags.schema";
import * as usersSchema from "@/users/users.schema";

const { users } = usersSchema;
const { follows } = profilesSchema;
const schema = {
	...usersSchema,
	...profilesSchema,
	...tagsSchema,
	...articlesSchema,
};

// See: https://github.com/drizzle-team/drizzle-orm/issues/3599
const db = drizzle(env.DATABASE_URL);

const { values } = parseArgs({
	args: Bun.argv,
	options: {
		reset: { type: "boolean", default: false },
	},
	strict: true,
	allowPositionals: true,
});

if (values.reset) {
	if (env.NODE_ENV === "production") {
		console.error(
			"❌ Database reset is only allowed in development or test environments.",
		);
		exit(1);
	}
	console.info(chalk.gray("Resetting database"));
	await reset(db, schema);
	console.info(`[${chalk.green("✓")}] Database reset complete`);
}

console.info(chalk.gray("Seeding database"));

// Auto seeding

await seed(db, schema).refine(() => ({
	users: {
		count: 10,
	},
	follows: {
		count: 0,
	},
}));

// Manual seeding

const userIds = await db.select({ id: users.id }).from(users);

const followsData = new Set<string>();
const followRows = [];

let attempts = 0;
const MAX_ATTEMPTS = 100; // Reasonable threshold for 20 follows

while (followRows.length < 20 && attempts < MAX_ATTEMPTS) {
	const follower = draw(userIds);
	const following = draw(userIds);

	if (!follower || !following) {
		attempts++;
		continue;
	}

	if (follower.id !== following.id) {
		const key = `${follower.id}-${following.id}`;
		if (!followsData.has(key)) {
			followsData.add(key);
			followRows.push({ followerId: follower.id, followingId: following.id });
		}
	}
	attempts++;
}

if (followRows.length < 20) {
	console.warn(
		`Could only generate ${followRows.length} unique follows after ${MAX_ATTEMPTS} attempts`,
	);
}

if (followRows.length > 0) {
	await db.insert(follows).values(followRows);
}

console.info(`[${chalk.green("✓")}] Database seeded`);

exit(0);
