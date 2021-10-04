/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testPathIgnorePatterns: ['/node_modules/', '/dist/'],
	resetMocks: true,
	setupFilesAfterEnv: ['./test/setup.ts'],
};
