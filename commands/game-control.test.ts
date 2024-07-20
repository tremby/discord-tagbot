import commandSpec from './game-control';
import { getCommandInteraction, getTextChannel, getGuild, getUser } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import type { APIApplicationCommandInteractionDataOption } from 'discord-api-types/v10';

import { mocked } from 'jest-mock';

jest.mock('../lib/game-state');
import {
	getStatusEmbedField,
	gameStateIsInactive,
	start,
	finish,
} from '../lib/game-state';
const mockGetStatusEmbedField = mocked(getStatusEmbedField);
const mockGameStateIsInactive = mocked(gameStateIsInactive);
const mockStart = mocked(start);
const mockFinish = mocked(finish);

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user1');

describe("game-control command", () => {
	beforeEach(() => {
		jest.spyOn(console, 'log').mockImplementation();
	});

	describe("start subcommand", () => {
		it("aborts if the game is already running", async () => {
			mockGameStateIsInactive.mockReturnValue(false);
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'start',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'game-control', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
			expect(mockStart).not.toHaveBeenCalled();
			expect(mockFinish).not.toHaveBeenCalled();
		});

		it("calls the start function", async () => {
			mockGameStateIsInactive.mockReturnValue(true);
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'start',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'game-control', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockStart).toHaveBeenCalledTimes(1);
			expect(mockStart).toHaveBeenCalledWith(game);
			expect(mockFinish).not.toHaveBeenCalled();
		});

		it("responds to the user on success", async () => {
			mockGameStateIsInactive.mockReturnValue(true);
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'start',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'game-control', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});

		it("logs a message with the subcommand, channel, server, and user", async () => {
			mockGameStateIsInactive.mockReturnValue(true);
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'start',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'game-control', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(console.log).toHaveBeenCalledTimes(1);
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining("start"));
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining(channel.id.toString()));
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining(guild.id.toString()));
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining(user1.id.toString()));
		});
	});

	describe("finish subcommand", () => {
		it("aborts if the game is not running", async () => {
			mockGameStateIsInactive.mockReturnValue(true);
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'finish',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'game-control', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
			expect(mockStart).not.toHaveBeenCalled();
			expect(mockFinish).not.toHaveBeenCalled();
		});

		it("calls the finish function", async () => {
			mockGameStateIsInactive.mockReturnValue(false);
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'finish',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'game-control', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockStart).not.toHaveBeenCalled();
			expect(mockFinish).toHaveBeenCalledTimes(1);
			expect(mockFinish).toHaveBeenCalledWith(game, false);
		});

		it("responds to the user on success", async () => {
			mockGameStateIsInactive.mockReturnValue(false);
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'finish',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'game-control', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});

		it("mentions that the game finished, if it did not restart", async () => {
			mockGameStateIsInactive.mockReturnValueOnce(false).mockReturnValue(true);
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'finish',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'game-control', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockGameStateIsInactive).toHaveBeenCalledTimes(2);
			expectInteractionResponse(interaction, true);
			expect(interaction.editReply).toHaveBeenCalledWith(expect.objectContaining({
				embeds: expect.arrayContaining([
					expect.objectContaining({
						title: expect.stringContaining("finished"),
					}),
				]),
			}));
		});

		it("mentions that the game restarted, if it did", async () => {
			mockGameStateIsInactive.mockReturnValue(false);
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'finish',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'game-control', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(mockGameStateIsInactive).toHaveBeenCalledTimes(2);
			expectInteractionResponse(interaction, true);
			expect(interaction.editReply).toHaveBeenCalledWith(expect.objectContaining({
				embeds: expect.arrayContaining([
					expect.objectContaining({
						title: expect.stringContaining("restarted"),
					}),
				]),
			}));
		});

		it("logs a message with the subcommand, channel, server, and user", async () => {
			mockGameStateIsInactive.mockReturnValue(false);
			const game = {} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'finish',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'game-control', options, {});
			await commandSpec.handler(interaction, channel, game);
			expect(console.log).toHaveBeenCalledTimes(1);
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining("finish"));
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining(channel.id.toString()));
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining(guild.id.toString()));
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining(user1.id.toString()));
		});
	});
});
