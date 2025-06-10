/* istanbul ignore file */

import { MessageFlags, type CommandInteraction, type InteractionReplyOptions } from 'discord.js';

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
		const fn = interaction.reply as jest.MockedFunction<typeof interaction.reply>;
		expect(fn).toHaveBeenCalledTimes(1);
		if (ephemeral) {
			expect(fn).toHaveBeenCalledWith(expect.objectContaining({ flags: expect.any(Number) }));
			expect((fn.mock.calls[fn.mock.calls.length - 1][0] as any).flags & MessageFlags.Ephemeral).toBeTruthy();
		} else {
			expectAnyOf(() => {
				expect(fn).toHaveBeenCalledWith(expect.objectContaining({ flags: expect.any(Number) }));
				expect((fn.mock.calls[fn.mock.calls.length - 1][0] as any).flags & MessageFlags.Ephemeral).toBeFalsy();
			}, () => {
				const fn = interaction.reply as jest.MockedFunction<typeof interaction.reply>;
				expect(fn.mock.calls[fn.mock.calls.length - 1][0]).not.toHaveProperty('flags');
			});
		}
		expect(interaction.editReply).not.toHaveBeenCalled();
	}, () => {
		const fn = interaction.deferReply as jest.MockedFunction<typeof interaction.deferReply>;
		expect(fn).toHaveBeenCalledTimes(1);
		if (ephemeral) {
			expect(fn).toHaveBeenCalledWith(expect.objectContaining({ flags: expect.any(Number) }));
			expect((fn.mock.calls[fn.mock.calls.length - 1][0] as any).flags & MessageFlags.Ephemeral).toBeTruthy();
		} else {
			expectAnyOf(() => {
				expect(fn).toHaveBeenCalledWith(expect.objectContaining({ flags: expect.any(Number) }));
				expect((fn.mock.calls[fn.mock.calls.length - 1][0] as any).flags & MessageFlags.Ephemeral).toBeFalsy();
			}, () => {
				expect(fn.mock.calls[fn.mock.calls.length - 1][0]).not.toHaveProperty('flags');
			});
		}
		expect(interaction.editReply).toHaveBeenCalledTimes(1);
		expect(interaction.reply).not.toHaveBeenCalled();
	});
}
