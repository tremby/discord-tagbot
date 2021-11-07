/**
 * Are two sets equal?
 */
export function setsEqual(a: Set<any>, b: Set<any>): boolean {
	if (a.size !== b.size) return false;
	for (const x of a) if (!b.has(x)) return false;
	return true;
}

/**
 * Get the intersection of two sets.
 */
export function setIntersection<T>(a: Set<T>, b: Set<T>): Set<T> {
	const out = new Set<T>();
	for (const x of a) if (b.has(x)) out.add(x);
	return out;
}

/**
 * Get the union of two sets.
 */
export function setUnion<T>(a: Set<T>, b: Set<T>): Set<T> {
	const out = new Set<T>(a);
	for (const x of b) out.add(x);
	return out;
}
