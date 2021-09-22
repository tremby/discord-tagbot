/**
 * Are two sets equal?
 */
export function setsEqual(a: Set<any>, b: Set<any>): boolean {
	if (a.size !== b.size) return false;
	for (const x of a) if (!b.has(x)) return false;
	return true;
}
