import * as m from './user';

describe("isGuildMemberRoleManager", () => {
	it("rejects plain arrays", () => {
		expect(m.isGuildMemberRoleManager([])).toBe(false);
	});

	it("rejects objects without expected properties", () => {
		expect(m.isGuildMemberRoleManager({})).toBe(false);
	});

	it("accepts objects with expected properties", () => {
		expect(m.isGuildMemberRoleManager({ holds: true })).toBe(true);
	});
});
