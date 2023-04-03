import commandSpec from './ranking-strategy';
import { getCommandInteraction, getTextChannel, getGuild, getUser } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import type { APIApplicationCommandInteractionDataOption } from 'discord-api-types/v10';

import { mocked } from 'jest-mock';

jest.mock('../lib/game-state');
import { updateGameStatusMessage } from '../lib/game-state';
const mockUpdateGameStatusMessage = mocked(updateGameStatusMessage);

jest.mock('../lib/config');
import { getConfigEmbedFields } from '../lib/config';
const mockGetConfigEmbedFields = mocked(getConfigEmbedFields);

jest.mock('../lib/state');
import { persist } from '../lib/state';
const mockPersist = mocked(persist);

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user1');

describe("ranking-strategy command", () => {
	describe("set subcommand", () => {
		it("can set the strategy", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'set',
					options: [
						{
							name: 'strategy',
							type: ApplicationCommandOptionType.String,
							value: 'modifiedCompetition',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'ranking-strategy', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(game.config).toHaveProperty('rankingStrategy', 'modifiedCompetition');
		});

		it("rejects unknown strategies", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'set',
					options: [
						{
							name: 'strategy',
							type: ApplicationCommandOptionType.String,
							value: 'x',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'ranking-strategy', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(game).not.toHaveProperty('config');
			expect(mockPersist).not.toHaveBeenCalled();
		});

		it("requires the strategy option", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'set',
					options: [],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'ranking-strategy', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(game).not.toHaveProperty('config');
			expect(mockPersist).not.toHaveBeenCalled();
		});

		it("saves the new configuration", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'set',
					options: [
						{
							name: 'strategy',
							type: ApplicationCommandOptionType.String,
							value: 'modifiedCompetition',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'ranking-strategy', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockPersist).toHaveBeenCalledTimes(1);
		});

		it("updates the game status message", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'set',
					options: [
						{
							name: 'strategy',
							type: ApplicationCommandOptionType.String,
							value: 'modifiedCompetition',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'ranking-strategy', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
			expect(mockUpdateGameStatusMessage).toHaveBeenCalledWith(game);
		});

		it("responds to the user", async () => {
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'set',
					options: [
						{
							name: 'strategy',
							type: ApplicationCommandOptionType.String,
							value: 'modifiedCompetition',
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'ranking-strategy', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});
	});
});
