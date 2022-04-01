import commandSpec from './disqualified';
import { getCommandInteraction, getTextChannel, getGuild, getUser } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';
import { Constants } from 'discord.js';
import type { APIApplicationCommandInteractionDataOption } from 'discord-api-types/v10';

import { mocked } from 'jest-mock';

jest.mock('../lib/game-state');
import {
	gameStateIsAwaitingNext,
	gameStateIsAwaitingMatch,
	getDisqualifiedPlayersEmbedField,
	getStatusEmbedField,
} from '../lib/game-state';
const mockGameStateIsAwaitingNext = mocked(gameStateIsAwaitingNext);
const mockGameStateIsAwaitingMatch = mocked(gameStateIsAwaitingMatch);
const mockGetDisqualifiedPlayersEmbedField = mocked(getDisqualifiedPlayersEmbedField);
const mockGetStatusEmbedField = mocked(getStatusEmbedField);

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user1');
const user2 = getUser('user2');

describe("disqualified command", () => {
	describe("add subcommand", () => {
		it("responds with an error and does nothing else if the game state isn't valid", async () => {
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(false);
			const game = {} as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'add',
					options: [
						{
							name: 'user',
							type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
							value: user1.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'disqualified', options, {
				users: { [user1.id]: user1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});

		it("responds with an error and does nothing else if the user is already disqualified", async () => {
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			const game = {
				state: {
					disqualifiedFromRound: new Set([user1]),
				},
			} as unknown as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'add',
					options: [
						{
							name: 'user',
							type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
							value: user1.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'disqualified', options, {
				users: { [user1.id]: user1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
			expect((game.state as GameStateAwaitingMatch).disqualifiedFromRound.size).toBe(1);
		});

		it("adds the user", async () => {
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			const game = {
				state: {
					disqualifiedFromRound: new Set(),
				},
			} as unknown as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'add',
					options: [
						{
							name: 'user',
							type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
							value: user1.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'disqualified', options, {
				users: { [user1.id]: user1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expect((game.state as GameStateAwaitingMatch).disqualifiedFromRound.size).toBe(1);
			expect((game.state as GameStateAwaitingMatch).disqualifiedFromRound.has(user1)).toBe(true);
		});

		it("replies to the user on success", async () => {
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			const game = {
				state: {
					disqualifiedFromRound: new Set(),
				},
			} as unknown as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'add',
					options: [
						{
							name: 'user',
							type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
							value: user1.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'disqualified', options, {
				users: { [user1.id]: user1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});
	});

	describe("remove subcommand", () => {
		it("responds with an error and does nothing else if the game state isn't valid", async () => {
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(false);
			const game = {} as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'remove',
					options: [
						{
							name: 'user',
							type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
							value: user1.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'disqualified', options, {
				users: { [user1.id]: user1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});

		it("responds with an error and does nothing else if the user is not already disqualified", async () => {
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			const game = {
				state: {
					disqualifiedFromRound: new Set(),
				},
			} as unknown as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'remove',
					options: [
						{
							name: 'user',
							type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
							value: user1.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'disqualified', options, {
				users: { [user1.id]: user1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
			expect((game.state as GameStateAwaitingMatch).disqualifiedFromRound.size).toBe(0);
		});

		it("removes the user", async () => {
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			const game = {
				state: {
					disqualifiedFromRound: new Set([user1]),
				},
			} as unknown as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'remove',
					options: [
						{
							name: 'user',
							type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
							value: user1.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'disqualified', options, {
				users: { [user1.id]: user1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expect((game.state as GameStateAwaitingMatch).disqualifiedFromRound.size).toBe(0);
		});

		it("does not remove other users", async () => {
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			const game = {
				state: {
					disqualifiedFromRound: new Set([user1, user2]),
				},
			} as unknown as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'remove',
					options: [
						{
							name: 'user',
							type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
							value: user1.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'disqualified', options, {
				users: { [user1.id]: user1, [user2.id]: user2 },
			});
			await commandSpec.handler(interaction, channel, game);
			expect((game.state as GameStateAwaitingMatch).disqualifiedFromRound.size).toBe(1);
			expect((game.state as GameStateAwaitingMatch).disqualifiedFromRound.has(user2)).toBe(true);
		});

		it("replies to the user on success", async () => {
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			const game = {
				state: {
					disqualifiedFromRound: new Set([user1]),
				},
			} as unknown as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'remove',
					options: [
						{
							name: 'user',
							type: Constants.ApplicationCommandOptionTypes.USER as number, // FIXME: broken types?
							value: user1.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'disqualified', options, {
				users: { [user1.id]: user1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});
	});

	describe("clear subcommand", () => {
		it("responds with an error and does nothing else if the game state isn't valid", async () => {
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(false);
			const game = {} as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'clear',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'disqualified', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});

		it("responds with an error and does nothing else if the list is already empty", async () => {
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			const game = {
				state: {
					disqualifiedFromRound: new Set(),
				},
			} as unknown as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'clear',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'disqualified', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
			expect((game.state as GameStateAwaitingMatch).disqualifiedFromRound.size).toBe(0);
		});

		it("clears the list", async () => {
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			const game = {
				state: {
					disqualifiedFromRound: new Set([user1]),
				},
			} as unknown as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'clear',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'disqualified', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect((game.state as GameStateAwaitingMatch).disqualifiedFromRound.size).toBe(0);
		});

		it("replies to the user on success", async () => {
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			const game = {
				state: {
					disqualifiedFromRound: new Set([user1]),
				},
			} as unknown as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'clear',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'disqualified', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});
	});
});
