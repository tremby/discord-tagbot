export function expectAnyOf(...tests: (() => void)[]): void {
	try {
		tests.shift()?.();
	} catch (e) {
		if (tests.length) expectAnyOf(...tests);
		else throw e;
	}
}

export async function flushPromises(): Promise<unknown> {
	const p = new Promise((resolve) => process.nextTick(resolve));
	jest.runAllTicks();
	return p;
}
