expect.extend({
	toBeFunctionWithName(received: any, name: string) {
		if (typeof received !== 'function' || received.name !== name) return {
			message: () => `expected ${received} to be a function with name ${name}`,
			pass: false,
		};
		return {
			message: () => `expected ${received} not to be a function with name ${name}`,
			pass: true,
		};
	},
});
