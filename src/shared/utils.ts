import { nanoid } from "nanoid";

export function slugify(...parts: string[]): string {
	const baseSlug = parts
		.join("-")
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();

	const suffix = nanoid(8);
	return `${baseSlug}-${suffix}`;
}
