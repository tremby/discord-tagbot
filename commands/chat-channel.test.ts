import commandSpec from './chat-channel';
import { getCommandInteraction, getTextChannel, getGuild, getUser, getMessage } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';
import { Constants } from 'discord.js';
import type { APIApplicationCommandInteractionDataOption } from 'discord-api-types';

import { mocked } from 'ts-jest/utils';

jest.mock('../lib/config');
import { getConfigEmbedFields } from '../lib/config';

const guild = getGuild();
const gameChannel = getTextChannel(guild);
const chatChannel = getTextChannel(guild);
const otherChannel = getTextChannel(guild);
const user1 = getUser('user1');

describe("chat-channel command", () => {
	describe("set subcommand", () => {
		it("responds with an error and otherwise does nothing if no channel was given", async () => {
			const game = {
				config: { chatChannel: null },
			} as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(gameChannel, user1, 'chat-channel', options, {});
			await commandSpec.handler(interaction, gameChannel, game);
			expectInteractionResponse(interaction, true);
			expect(game).toHaveProperty('config.chatChannel', null);
		});

		it("registers the chat channel in configuration, if previously none was set", async () => {
			const game = {
				config: { chatChannel: null },
			} as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
					options: [
						{
							name: 'channel',
							type: Constants.ApplicationCommandOptionTypes.CHANNEL as number, // FIXME: broken types?
							value: chatChannel.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(gameChannel, user1, 'chat-channel', options, {
				channels: { [chatChannel.id]: chatChannel },
			});
			await commandSpec.handler(interaction, gameChannel, game);
			expect(game).toHaveProperty('config.chatChannel', chatChannel);
		});

		it("can switch the chat channel to another", async () => {
			const game = {
				config: { chatChannel: otherChannel },
			} as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
					options: [
						{
							name: 'channel',
							type: Constants.ApplicationCommandOptionTypes.CHANNEL as number, // FIXME: broken types?
							value: chatChannel.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(gameChannel, user1, 'chat-channel', options, {
				channels: { [chatChannel.id]: chatChannel },
			});
			await commandSpec.handler(interaction, gameChannel, game);
			expect(game).toHaveProperty('config.chatChannel', chatChannel);
		});

		it("leaves alone any other configuration", async () => {
			const game = {
				config: { nextTagTimeLimit: 42, chatChannel: null },
			} as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
					options: [
						{
							name: 'channel',
							type: Constants.ApplicationCommandOptionTypes.CHANNEL as number, // FIXME: broken types?
							value: chatChannel.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(gameChannel, user1, 'chat-channel', options, {
				channels: { [chatChannel.id]: chatChannel },
			});
			await commandSpec.handler(interaction, gameChannel, game);
			expect(game).toHaveProperty('config.nextTagTimeLimit', 42);
		});

		it("responds to the user", async () => {
			const game = {
				config: { chatChannel: null },
			} as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'set',
					options: [
						{
							name: 'channel',
							type: Constants.ApplicationCommandOptionTypes.CHANNEL as number, // FIXME: broken types?
							value: chatChannel.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(gameChannel, user1, 'chat-channel', options, {
				channels: { [chatChannel.id]: chatChannel },
			});
			await commandSpec.handler(interaction, gameChannel, game);
			expectInteractionResponse(interaction, true);
		});
	});

	describe("unset subcommand", () => {
		it("responds with an error and otherwise does nothing if there wasn't a chat channel already", async () => {
			const game = {
				config: { chatChannel: null },
			} as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'unset',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(gameChannel, user1, 'chat-channel', options, {});
			await commandSpec.handler(interaction, gameChannel, game);
			expectInteractionResponse(interaction, true);
			expect(game).toHaveProperty('config.chatChannel', null);
		});

		it("unregisters the chat channel from configuration", async () => {
			const game = {
				config: { chatChannel },
			} as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'unset',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(gameChannel, user1, 'chat-channel', options, {});
			await commandSpec.handler(interaction, gameChannel, game);
			expect(game).toHaveProperty('config.chatChannel', null);
		});

		it("leaves alone any other configuration", async () => {
			const game = {
				config: { nextTagTimeLimit: 42, chatChannel },
			} as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'unset',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(gameChannel, user1, 'chat-channel', options, {});
			await commandSpec.handler(interaction, gameChannel, game);
			expect(game).toHaveProperty('config.nextTagTimeLimit', 42);
		});

		it("responds to the user", async () => {
			const game = {
				config: { chatChannel },
			} as Game;
			const options = [
				{
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND as number, // FIXME: broken types?
					name: 'unset',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(gameChannel, user1, 'chat-channel', options, {});
			await commandSpec.handler(interaction, gameChannel, game);
			expectInteractionResponse(interaction, true);
		});
	});
});
