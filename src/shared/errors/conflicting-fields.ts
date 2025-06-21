import { StatusCodes } from "http-status-codes";
import { objectify } from "radashi";
import { RealWorldError } from "./realworld";

export class ConflictingFieldsError extends RealWorldError {
	constructor(
		/**
		 * The entity that the conflicting fields belong to, singularized
		 * @example "user"
		 */
		public entity: string,
		/**
		 * List of fields that are conflicting
		 * @example ["email", "username"]
		 */
		public fields: string[],
	) {
		super(
			StatusCodes.CONFLICT,
			objectify(
				fields,
				(field) => `${entity}.${field}`,
				() => ["is already taken"],
			),
		);
	}
}
