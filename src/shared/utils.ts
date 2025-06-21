export function slugify(...parts: string[]): string {
	const baseSlug = parts
		.join("-")
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();

	const suffix = crypto.randomUUID().slice(0, 8);
	return `${baseSlug}-${suffix}`;
}
