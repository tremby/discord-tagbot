import commandSpec from './forget';
import { getCommandInteraction, getTextChannel, getGuild, getUser, getMessage } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';

import { mocked } from 'jest-mock';

jest.mock('../lib/state');
import gameState, { persistToDisk } from '../lib/state';
const mockPersistToDisk = mocked(persistToDisk);

jest.mock('../lib/timers');
import { clearTimers } from '../lib/timers';
const mockClearTimers = mocked(clearTimers);

const guild = getGuild();
const channel1 = getTextChannel(guild);
const channel2 = getTextChannel(guild);
const user1 = getUser('user1');

const game1 = {
	channel: channel1,
} as Game;
const game2 = {
	channel: channel2,
} as Game;

describe("forget command", () => {
	beforeEach(() => {
		gameState.games = new Set([
			game1,
			game2,
		]);
	});

	it("gives an ephemeral response on success", async () => {
		const interaction = getCommandInteraction(channel1, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel1, game1);
		expectInteractionResponse(interaction, true);
	});

	it("removes the game from the global state", async () => {
		const interaction = getCommandInteraction(channel1, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel1, game1);
		expect(gameState.games.size).toBe(1);
		expect(gameState.games.has(game1)).toBe(false);
	});

	it("stops any running timers", async () => {
		const interaction = getCommandInteraction(channel1, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel1, game1);
		expect(mockClearTimers).toHaveBeenCalledTimes(1);
		expect(mockClearTimers).toHaveBeenCalledWith(game1);
	});

	it("persists to disk", async () => {
		const interaction = getCommandInteraction(channel1, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel1, game1);
		expect(mockPersistToDisk).toHaveBeenCalledTimes(1);
	});
});
