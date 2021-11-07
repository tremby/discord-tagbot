import commandSpec from './excluded-remove';
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

describe("excluded-remove command", () => {
	it("responds with an error and does nothing else if the game state isn't valid", async () => {
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockGameStateIsAwaitingMatch.mockReturnValue(false);
		const game = {} as Game;
		const options = [{
			name: 'user',
			type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
			value: user1.id,
		} as ApplicationCommandInteractionDataOptionRole];
		const interaction = getCommandInteraction(channel, user1, 'excluded-remove', options, {
			users: { [user1.id]: user1 },
		});
		await commandSpec.handler(interaction, channel, game);
		expectInteractionResponse(interaction, true);
	});

	it("responds with an error and does nothing else if the user is not already banned", async () => {
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		const game = {
			state: {
				excludedFromRound: new Set(),
			},
		} as unknown as Game;
		const options = [{
			name: 'user',
			type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
			value: user1.id,
		} as ApplicationCommandInteractionDataOptionRole];
		const interaction = getCommandInteraction(channel, user1, 'excluded-remove', options, {
			users: { [user1.id]: user1 },
		});
		await commandSpec.handler(interaction, channel, game);
		expectInteractionResponse(interaction, true);
		expect((game.state as GameStateAwaitingMatch).excludedFromRound.size).toBe(0);
	});

	it("removes the user", async () => {
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		const game = {
			state: {
				excludedFromRound: new Set([user1]),
			},
		} as unknown as Game;
		const options = [{
			name: 'user',
			type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
			value: user1.id,
		} as ApplicationCommandInteractionDataOptionRole];
		const interaction = getCommandInteraction(channel, user1, 'excluded-remove', options, {
			users: { [user1.id]: user1 },
		});
		await commandSpec.handler(interaction, channel, game);
		expect((game.state as GameStateAwaitingMatch).excludedFromRound.size).toBe(0);
	});

	it("does not remove other users", async () => {
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		const game = {
			state: {
				excludedFromRound: new Set([user1, user2]),
			},
		} as unknown as Game;
		const options = [{
			name: 'user',
			type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
			value: user1.id,
		} as ApplicationCommandInteractionDataOptionRole];
		const interaction = getCommandInteraction(channel, user1, 'excluded-remove', options, {
			users: { [user1.id]: user1, [user2.id]: user2 },
		});
		await commandSpec.handler(interaction, channel, game);
		expect((game.state as GameStateAwaitingMatch).excludedFromRound.size).toBe(1);
		expect((game.state as GameStateAwaitingMatch).excludedFromRound.has(user2)).toBe(true);
	});

	it("replies to the user on success", async () => {
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		const game = {
			state: {
				excludedFromRound: new Set([user1]),
			},
		} as unknown as Game;
		const options = [{
			name: 'user',
			type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
			value: user1.id,
		} as ApplicationCommandInteractionDataOptionRole];
		const interaction = getCommandInteraction(channel, user1, 'excluded-remove', options, {
			users: { [user1.id]: user1 },
		});
		await commandSpec.handler(interaction, channel, game);
		expectInteractionResponse(interaction, true);
	});
});
