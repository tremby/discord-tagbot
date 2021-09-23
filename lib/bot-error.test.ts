import { BotError } from './bot-error';

describe("BotError", () => {
	it("is an instance of BotError", () => {
		const e = new BotError("x");
		expect(e).toBeInstanceOf(BotError);
	});

	it("is a subclass of Error", () => {
		const e = new BotError("x");
		expect(e).toBeInstanceOf(Error);
	});

	it("keeps its message", () => {
		const e = new BotError("x");
		expect(e.message).toBe("x");
	});

	it("has the expected name", () => {
		const e = new BotError("x");
		expect(e.name).toBe("BotError");
	});
});
