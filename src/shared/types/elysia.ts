type SchemaWithStatic = { static: unknown };

/**
 * Type helper to extract static types from Elysia models
 * @example
 * ```ts
 * const { models } = usersModel;
 * type User = ModelsStatic<typeof models>["User"];
 * ```
 */
export type ModelsStatic<T> = {
	[K in keyof T]: T[K] extends { Schema: () => SchemaWithStatic }
		? ReturnType<T[K]["Schema"]>["static"]
		: never;
};
