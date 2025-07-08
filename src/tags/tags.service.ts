import type { Tag } from "@prisma/client";
import { db } from "@/core/db";

export async function findAll(): Promise<Tag[]> {
	return await db.tag.findMany();
}
