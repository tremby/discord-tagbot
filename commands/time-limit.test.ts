import commandSpec from './time-limit';
import { getCommandInteraction, getTextChannel, getGuild, getUser } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';
import { Constants } from 'discord.js';
import type { APIApplicationCommandInteractionDataOption } from 'discord-api-types/v10';

import { mocked } from 'jest-mock';

jest.mock('../lib/state');
import gameState, { persistToDisk } from '../lib/state';
const mockPersistToDisk = mocked(persistToDisk);

jest.mock('../lib/config');
import { getConfigEmbedFields } from '../lib/config';
const mockGetConfigEmbedFields = mocked(getConfigEmbedFields);

jest.mock('../lib/game-state');
import { updateGameStatusMessage } from '../lib/game-state';
const mockUpdateGameStatusMessage = mocked(updateGameStatusMessage);

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user1');

describe("time-limit command", () => {
	beforeEach(() => {
		mockUpdateGameStatusMessage.mockResolvedValue();
	});

	describe("set subcommand", () => {
		it("rejects zero and does not change existing config", async () => {
			const config = { nextTagTimeLimit: 42 } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
					options: [
						{
							name: 'time-limit',
							type: Constants.ApplicationCommandOptionTypes.INTEGER as number, // FIXME: broken types?
							value: 0,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
			expect(game).toHaveProperty('config.nextTagTimeLimit', 42);
			expect(mockUpdateGameStatusMessage).not.toHaveBeenCalled();
			expect(mockPersistToDisk).not.toHaveBeenCalled();
		});

		it("rejects negative values and does not change existing config", async () => {
			const config = { nextTagTimeLimit: 42 } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
					options: [
						{
							name: 'time-limit',
							type: Constants.ApplicationCommandOptionTypes.INTEGER as number, // FIXME: broken types?
							value: -10,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
			expect(game).toHaveProperty('config.nextTagTimeLimit', 42);
			expect(mockUpdateGameStatusMessage).not.toHaveBeenCalled();
			expect(mockPersistToDisk).not.toHaveBeenCalled();
		});

		it("can change the time limit from none", async () => {
			const config = { nextTagTimeLimit: null } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
					options: [
						{
							name: 'time-limit',
							type: Constants.ApplicationCommandOptionTypes.INTEGER as number, // FIXME: broken types?
							value: 10,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(game).toHaveProperty('config.nextTagTimeLimit', expect.any(Number));
		});

		it("can change the time limit from an existing time limit", async () => {
			const config = { nextTagTimeLimit: null } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
					options: [
						{
							name: 'time-limit',
							type: Constants.ApplicationCommandOptionTypes.INTEGER as number, // FIXME: broken types?
							value: 10,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(game).toHaveProperty('config.nextTagTimeLimit', expect.any(Number));
			expect(game).not.toHaveProperty('config.nextTagTimeLimit', 42);
		});

		it("converts from minutes to milliseconds", async () => {
			const config = { nextTagTimeLimit: null } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
					options: [
						{
							name: 'time-limit',
							type: Constants.ApplicationCommandOptionTypes.INTEGER as number, // FIXME: broken types?
							value: 10,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(game).toHaveProperty('config.nextTagTimeLimit', 10 * 60e3);
		});

		it("responds on success", async () => {
			const config = { nextTagTimeLimit: null } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
					options: [
						{
							name: 'time-limit',
							type: Constants.ApplicationCommandOptionTypes.INTEGER as number, // FIXME: broken types?
							value: 10,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});

		it("shows the new configuration", async () => {
			const config = { nextTagTimeLimit: null } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
					options: [
						{
							name: 'time-limit',
							type: Constants.ApplicationCommandOptionTypes.INTEGER as number, // FIXME: broken types?
							value: 10,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockGetConfigEmbedFields).toHaveBeenCalledTimes(1);
			expect(mockGetConfigEmbedFields).toHaveBeenCalledWith(expect.objectContaining({ nextTagTimeLimit: 10 * 60e3 }));
		});

		it("updates the pinned status message", async () => {
			const config = { nextTagTimeLimit: null } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
					options: [
						{
							name: 'time-limit',
							type: Constants.ApplicationCommandOptionTypes.INTEGER as number, // FIXME: broken types?
							value: 10,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
			expect(mockUpdateGameStatusMessage).toHaveBeenCalledWith(game);
		});

		it("persists to disk", async () => {
			const config = { nextTagTimeLimit: null } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
					options: [
						{
							name: 'time-limit',
							type: Constants.ApplicationCommandOptionTypes.INTEGER as number, // FIXME: broken types?
							value: 10,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockPersistToDisk).toHaveBeenCalledTimes(1);
		});
	});

	describe("clear subcommand", () => {
		it("clears the time limit", async () => {
			const config = { nextTagTimeLimit: 42 } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'clear',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(game).toHaveProperty('config.nextTagTimeLimit', null);
		});

		it("responds on success", async () => {
			const config = { nextTagTimeLimit: 42 } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'clear',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});

		it("shows the new configuration", async () => {
			const config = { nextTagTimeLimit: 42 } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'clear',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockGetConfigEmbedFields).toHaveBeenCalledTimes(1);
			expect(mockGetConfigEmbedFields).toHaveBeenCalledWith(expect.objectContaining({ nextTagTimeLimit: null }));
		});

		it("updates the pinned status message", async () => {
			const config = { nextTagTimeLimit: 42 } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'clear',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
			expect(mockUpdateGameStatusMessage).toHaveBeenCalledWith(game);
		});
	});

	describe("unknown subcommand", () => {
		it("responds with an error and does nothing else", async () => {
			const config = { nextTagTimeLimit: 42 } as Config;
			const game = { config } as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'x',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'time-limit', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
			expect(game).toHaveProperty('config.nextTagTimeLimit', 42);
			expect(mockUpdateGameStatusMessage).not.toHaveBeenCalled();
		});
	});
});
