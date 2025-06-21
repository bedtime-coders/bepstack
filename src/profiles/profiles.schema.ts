import { sql } from "drizzle-orm";
import {
	check,
	pgTable,
	primaryKey,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/users/users.schema";

export const follows = pgTable(
	"follows",
	{
		followerId: uuid("follower_id")
			.notNull()
			.references(() => users.id),
		followingId: uuid("following_id")
			.notNull()
			.references(() => users.id),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at")
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		primaryKey({ columns: [table.followerId, table.followingId] }),
		check(
			"unique_follower_following",
			sql`${table.followerId} != ${table.followingId}`,
		),
	],
);
