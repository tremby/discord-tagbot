import commandSpec from './lifespan';
import { getCommandInteraction, getTextChannel, getGuild, getUser } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import type { APIApplicationCommandInteractionDataOption } from 'discord-api-types/v10';

import { mocked } from 'jest-mock';

jest.mock('../lib/game-state');
import { updateGameStatusMessage } from '../lib/game-state';
const mockUpdateGameStatusMessage = mocked(updateGameStatusMessage);

jest.mock('../lib/timers');
import { setTimers, clearTimers } from '../lib/timers';
const mockSetTimers = mocked(setTimers);
const mockClearTimers = mocked(clearTimers);

jest.mock('../lib/config');
import { getConfigEmbedFields } from '../lib/config';
const mockGetConfigEmbedFields = mocked(getConfigEmbedFields);

jest.mock('../lib/state');
import { persist } from '../lib/state';
const mockPersist = mocked(persist);

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user1');

describe("lifespan command", () => {
	describe("period subcommand", () => {
		it("can set the period to null", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'period',
					options: [
						{
							name: 'period',
							type: ApplicationCommandOptionType.String,
							value: 'manual',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(game.config).toHaveProperty('period', null);
		});

		it("can set the period to month", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'period',
					options: [
						{
							name: 'period',
							type: ApplicationCommandOptionType.String,
							value: 'month',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(game.config).toHaveProperty('period', 'month');
		});

		it("saves the new configuration", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'period',
					options: [
						{
							name: 'period',
							type: ApplicationCommandOptionType.String,
							value: 'month',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockPersist).toHaveBeenCalledTimes(1);
		});

		it("updates the game status message", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'period',
					options: [
						{
							name: 'period',
							type: ApplicationCommandOptionType.String,
							value: 'month',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
			expect(mockUpdateGameStatusMessage).toHaveBeenCalledWith(game);
		});

		it("resets game timers", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'period',
					options: [
						{
							name: 'period',
							type: ApplicationCommandOptionType.String,
							value: 'month',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockClearTimers).toHaveBeenCalledTimes(1);
			expect(mockClearTimers).toHaveBeenCalledWith(game);
			expect(mockSetTimers).toHaveBeenCalledTimes(1);
			expect(mockSetTimers).toHaveBeenCalledWith(game, game.state);
		});

		it("responds to the user", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'period',
					options: [
						{
							name: 'period',
							type: ApplicationCommandOptionType.String,
							value: 'month',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});
	});

	describe("auto-restart subcommand", () => {
		it("can set auto-restart to true", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'auto-restart',
					options: [
						{
							name: 'auto-restart',
							type: ApplicationCommandOptionType.Boolean,
							value: true,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(game.config).toHaveProperty('autoRestart', true);
		});

		it("can set auto-restart to false", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'auto-restart',
					options: [
						{
							name: 'auto-restart',
							type: ApplicationCommandOptionType.Boolean,
							value: false,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(game.config).toHaveProperty('autoRestart', false);
		});

		it("saves the new configuration", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'auto-restart',
					options: [
						{
							name: 'auto-restart',
							type: ApplicationCommandOptionType.Boolean,
							value: true,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockPersist).toHaveBeenCalledTimes(1);
		});

		it("updates the game status message", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'auto-restart',
					options: [
						{
							name: 'auto-restart',
							type: ApplicationCommandOptionType.Boolean,
							value: true,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
			expect(mockUpdateGameStatusMessage).toHaveBeenCalledWith(game);
		});

		it("responds to the user", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'auto-restart',
					options: [
						{
							name: 'auto-restart',
							type: ApplicationCommandOptionType.Boolean,
							value: true,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});
	});

	describe("locale subcommand", () => {
		it("can set the locale", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'locale',
					options: [
						{
							name: 'locale',
							type: ApplicationCommandOptionType.String,
							value: 'America/Chicago',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(game.config).toHaveProperty('locale', 'America/Chicago');
		});

		it("saves the new configuration", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'locale',
					options: [
						{
							name: 'locale',
							type: ApplicationCommandOptionType.String,
							value: 'America/Chicago',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockPersist).toHaveBeenCalledTimes(1);
		});

		it("updates the game status message", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'locale',
					options: [
						{
							name: 'locale',
							type: ApplicationCommandOptionType.String,
							value: 'America/Chicago',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
			expect(mockUpdateGameStatusMessage).toHaveBeenCalledWith(game);
		});

		it("resets game timers", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'locale',
					options: [
						{
							name: 'locale',
							type: ApplicationCommandOptionType.String,
							value: 'America/Chicago',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockClearTimers).toHaveBeenCalledTimes(1);
			expect(mockClearTimers).toHaveBeenCalledWith(game);
			expect(mockSetTimers).toHaveBeenCalledTimes(1);
			expect(mockSetTimers).toHaveBeenCalledWith(game, game.state);
		});

		it("responds to the user", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'locale',
					options: [
						{
							name: 'locale',
							type: ApplicationCommandOptionType.String,
							value: 'America/Chicago',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'lifespan', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});
	});
});
