export class RealWorldError extends Error {
	constructor(
		public status: number,
		public errors: Record<string, string[]>,
	) {
		super(JSON.stringify(errors));
		this.name = "RealWorldError";
	}
}
