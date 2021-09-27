import * as m from './set';

describe("setsEqual", () => {
	it("requires all items from A to be in B", () => {
		expect(m.setsEqual(new Set([1, 2, 3]), new Set([1, 2]))).toBe(false);
	});

	it("requires all items from B to be in A", () => {
		expect(m.setsEqual(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false);
	});

	it("treats empty sets as equal", () => {
		expect(m.setsEqual(new Set([]), new Set([]))).toBe(true);
	});

	it("returns true for equal sets", () => {
		expect(m.setsEqual(new Set([1, 2]), new Set([1, 2]))).toBe(true);
	});
});

describe("setIntersection", () => {
	it("returns an empty set if there is no intersection", () => {
		expect(m.setIntersection(new Set([1, 2]), new Set([3, 4])).size).toBe(0);
	});

	it("returns an empty set if two empty sets are intersected", () => {
		expect(m.setIntersection(new Set([]), new Set([])).size).toBe(0);
	});

	it("returns the elements present in both sets", () => {
		const result = m.setIntersection(new Set([1, 2, 3]), new Set([2, 3, 4]));
		expect(result.size).toBe(2);
		expect(result.has(2)).toBe(true);
		expect(result.has(3)).toBe(true);
	});
});
