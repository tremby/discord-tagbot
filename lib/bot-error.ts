export class BotError extends Error {
	constructor(message: string) {
		super(message);
		Object.setPrototypeOf(this, new.target.prototype);
	}

	get name() {
		return this.constructor.name;
	}
}
