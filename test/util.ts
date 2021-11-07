/* istanbul ignore file */

import type { CommandInteraction } from 'discord.js';

export function expectAnyOf(...tests: (() => void)[]): void {
	try {
		tests.shift()?.();
	} catch (e) {
		if (tests.length) expectAnyOf(...tests);
		else throw e;
	}
}

export async function flushPromises(): Promise<unknown> {
	// XXX
	// Here be dragons.
	// I don't really know how this works.
	// Sometimes it needs to be called twice and I don't know why.
	const p = new Promise((resolve) => process.nextTick(resolve));
	jest.runAllTicks();
	return p;
}

export function expectInteractionResponse(interaction: CommandInteraction, ephemeral: boolean): void {
	expectAnyOf(() => {
		expect(interaction.reply).toHaveBeenCalledTimes(1);
		if (ephemeral) {
			expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
		} else {
			expectAnyOf(() => {
				expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: false }));
			}, () => {
				const fn = interaction.reply as jest.MockedFunction<typeof interaction.reply>;
				expect(fn.mock.calls[fn.mock.calls.length - 1]).not.toHaveProperty('ephemeral');
			});
		}
		expect(interaction.editReply).not.toHaveBeenCalled();
	}, () => {
		expect(interaction.deferReply).toHaveBeenCalledTimes(1);
		if (ephemeral) {
			expect(interaction.deferReply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
		} else {
			expectAnyOf(() => {
				expect(interaction.deferReply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: false }));
			}, () => {
				const fn = interaction.deferReply as jest.MockedFunction<typeof interaction.deferReply>;
				expect(fn.mock.calls[fn.mock.calls.length - 1]).not.toHaveProperty('ephemeral');
			});
		}
		expect(interaction.editReply).toHaveBeenCalledTimes(1);
		expect(interaction.reply).not.toHaveBeenCalled();
	});
}
