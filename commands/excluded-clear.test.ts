import commandSpec from './excluded-clear';
import { getCommandInteraction, getTextChannel, getGuild, getUser, getRole } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';
import { Constants } from 'discord.js';
import type { ApplicationCommandInteractionDataOptionRole } from 'discord-api-types';

import { mocked } from 'ts-jest/utils';

jest.mock('../lib/game-state');
import {
	gameStateIsAwaitingNext,
	gameStateIsAwaitingMatch,
	getExcludedPlayersEmbedField,
	getStatusEmbedField,
} from '../lib/game-state';
import { getStatusMessage } from '../lib/channel';
const mockGameStateIsAwaitingNext = mocked(gameStateIsAwaitingNext);
const mockGameStateIsAwaitingMatch = mocked(gameStateIsAwaitingMatch);
const mockGetExcludedPlayersEmbedField = mocked(getExcludedPlayersEmbedField);
const mockGetStatusEmbedField = mocked(getStatusEmbedField);

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user1');
const user2 = getUser('user2');

describe("excluded-clear command", () => {
	it("responds with an error and does nothing else if the game state isn't valid", async () => {
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockGameStateIsAwaitingMatch.mockReturnValue(false);
		const game = {} as Game;
		const interaction = getCommandInteraction(channel, user1, 'excluded-clear', [], {});
		await commandSpec.handler(interaction, channel, game);
		expectInteractionResponse(interaction, true);
	});

	it("responds with an error and does nothing else if the list is already empty", async () => {
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		const game = {
			state: {
				excludedFromRound: new Set(),
			},
		} as unknown as Game;
		const interaction = getCommandInteraction(channel, user1, 'excluded-clear', [], {});
		await commandSpec.handler(interaction, channel, game);
		expectInteractionResponse(interaction, true);
		expect((game.state as GameStateAwaitingMatch).excludedFromRound.size).toBe(0);
	});

	it("clears the list", async () => {
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		const game = {
			state: {
				excludedFromRound: new Set([user1]),
			},
		} as unknown as Game;
		const interaction = getCommandInteraction(channel, user1, 'excluded-clear', [], {});
		await commandSpec.handler(interaction, channel, game);
		expect((game.state as GameStateAwaitingMatch).excludedFromRound.size).toBe(0);
	});

	it("replies to the user on success", async () => {
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		const game = {
			state: {
				excludedFromRound: new Set([user1]),
			},
		} as unknown as Game;
		const interaction = getCommandInteraction(channel, user1, 'excluded-clear', [], {});
		await commandSpec.handler(interaction, channel, game);
		expectInteractionResponse(interaction, true);
	});
});
