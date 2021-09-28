import * as m from './string';

describe("pluralize", () => {
	it("uses the singular if the count is 1", () => {
		expect(m.pluralize("foo", 1, "s", "")).toBe("foo");
	});

	it("uses the plural if the count is 2", () => {
		expect(m.pluralize("foo", 2, "s", "")).toBe("foos");
	});

	it("uses the plural if the count is 0", () => {
		expect(m.pluralize("foo", 0, "s", "")).toBe("foos");
	});

	it("defaults the singular suffix to empty string", () => {
		expect(m.pluralize("foo", 1, "s")).toBe("foo");
	});

	it("defaults the plural suffix to \"s\"", () => {
		expect(m.pluralize("foo", 2)).toBe("foos");
	});
});

describe("msToHumanReadable", () => {
	const ms = 1;
	const sec = ms * 1e3;
	const min = sec * 60;
	const hour = min * 60;
	const day = hour * 24;

	beforeEach(() => {
		jest.spyOn(m, 'pluralize').mockImplementation((str) => str);
	});

	it("returns a special string for values less than a second", () => {
		expect(m.msToHumanReadable(ms * 999)).toBe("less than a second");
		expect(m.msToHumanReadable(ms)).toBe("less than a second");
		expect(m.msToHumanReadable(0)).toBe("less than a second");
	});

	it("correctly handles times less than a minute", () => {
		expect(m.msToHumanReadable(sec)).toBe("1 second");
		expect(m.msToHumanReadable(sec * 5 + ms * 50)).toBe("5 second");
		expect(m.msToHumanReadable(min - ms)).toBe("59 second");
	});

	it("correctly handles times less than an hour", () => {
		expect(m.msToHumanReadable(min)).toBe("1 minute");
		expect(m.msToHumanReadable(hour - ms)).toBe("59 minute, 59 second");
	});

	it("correctly handles times less than a day", () => {
		expect(m.msToHumanReadable(hour)).toBe("1 hour");
		expect(m.msToHumanReadable(hour + sec)).toBe("1 hour, 1 second");
		expect(m.msToHumanReadable(hour + min)).toBe("1 hour, 1 minute");
		expect(m.msToHumanReadable(hour + min + sec)).toBe("1 hour, 1 minute, 1 second");
		expect(m.msToHumanReadable(day - ms)).toBe("23 hour, 59 minute, 59 second");
	});

	it("correctly handles times more than a day", () => {
		expect(m.msToHumanReadable(day)).toBe("1 day");
		expect(m.msToHumanReadable(day + sec)).toBe("1 day, 1 second");
		expect(m.msToHumanReadable(day + min)).toBe("1 day, 1 minute");
		expect(m.msToHumanReadable(day + min + sec)).toBe("1 day, 1 minute, 1 second");
		expect(m.msToHumanReadable(day + hour)).toBe("1 day, 1 hour");
		expect(m.msToHumanReadable(day + hour + sec)).toBe("1 day, 1 hour, 1 second");
		expect(m.msToHumanReadable(day + hour + min)).toBe("1 day, 1 hour, 1 minute");
		expect(m.msToHumanReadable(day + hour + min + sec)).toBe("1 day, 1 hour, 1 minute, 1 second");
		expect(m.msToHumanReadable(400 * day)).toBe("400 day");
	});
});

describe("toList", () => {
	it("handles an empty set", () => {
		expect(m.toList(new Set())).toBe("");
	});

	it("handles a set of length 1", () => {
		expect(m.toList(new Set(["foo"]))).toBe("foo");
	});

	it("handles a set of length 2", () => {
		const acceptable = [
			"foo and bar",
			"bar and foo",
		];
		expect(acceptable).toContain(m.toList(new Set(["foo", "bar"])));
	});

	it("handles a set of length 3", () => {
		const acceptable = [
			"foo, bar, and baz",
			"foo, baz, and bar",
			"bar, baz, and foo",
			"bar, foo, and baz",
			"baz, foo, and bar",
			"baz, bar, and foo",
		];
		expect(acceptable).toContain(m.toList(new Set(["foo", "bar", "baz"])));
	});

	it("handles a set of length 4", () => {
		const acceptable = [
			"foo, bar, baz, and bat",
			"foo, bar, bat, and baz",
			"foo, baz, bar, and bat",
			"foo, baz, bat, and bar",
			"foo, bat, bar, and baz",
			"foo, bat, baz, and bar",
			"bar, foo, baz, and bat",
			"bar, foo, bat, and baz",
			"bar, baz, foo, and bat",
			"bar, baz, bat, and foo",
			"bar, bat, foo, and baz",
			"bar, bat, baz, and foo",
			"baz, bar, foo, and bat",
			"baz, bar, bat, and foo",
			"baz, foo, bar, and bat",
			"baz, foo, bat, and bar",
			"baz, bat, bar, and foo",
			"baz, bat, foo, and bar",
			"bat, bar, baz, and foo",
			"bat, bar, foo, and baz",
			"bat, baz, bar, and foo",
			"bat, baz, foo, and bar",
			"bat, foo, bar, and baz",
			"bat, foo, baz, and bar",
		];
		expect(acceptable).toContain(m.toList(new Set(["foo", "bar", "baz", "bat"])));
	});
});
