import * as m from './role';

describe("isRole", () => {
	it("requires some particular fields which appear in Role but not in APIRole", () => {
		expect(m.isRole({})).toBe(false);
		expect(m.isRole({ createdAt: true, createdTimestamp: true, editable: true })).toBe(true);
		expect(m.isRole({ createdTimestamp: true, editable: true })).toBe(false);
		expect(m.isRole({ createdAt: true, editable: true })).toBe(false);
		expect(m.isRole({ createdAt: true, createdTimestamp: true })).toBe(false);
	});
});
