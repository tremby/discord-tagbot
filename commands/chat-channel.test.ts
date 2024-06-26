import commandSpec from './chat-channel';
import type { CommandInteraction, TextChannel } from 'discord.js';
import { getCommandInteraction, getTextChannel, getGuild, getUser, getMessage } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import type { APIApplicationCommandInteractionDataOption } from 'discord-api-types/v10';

import { mocked } from 'jest-mock';

jest.mock('../lib/config');
import { getConfigEmbedFields } from '../lib/config';
const mockGetConfigEmbedFields = mocked(getConfigEmbedFields);

const configEmbedFields = [
	{
		name: "Config field 1",
		value: "Config value 1",
		inline: true,
	},
	{
		name: "Config field 2",
		value: "Config value 2",
		inline: true,
	},
];

jest.mock('./lib/helpers');
import { getValidChannel, NoTextChannelError } from './lib/helpers';
const mockGetValidChannel = mocked(getValidChannel);

jest.mock('../lib/permissions');
import { getPermissionsEmbedField } from '../lib/permissions';
const mockGetPermissionsEmbedField = mocked(getPermissionsEmbedField);

const permissionsEmbedField = {
	name: "Permissions",
	value: "Abcd",
	inline: true,
};

const guild = getGuild();
const gameChannel = getTextChannel(guild);
const chatChannel = getTextChannel(guild);
const otherChannel = getTextChannel(guild);
const user1 = getUser('user1');

describe("chat-channel command", () => {
	describe("set subcommand", () => {
		beforeEach(() => {
			mockGetValidChannel.mockReturnValue(chatChannel);
			mockGetConfigEmbedFields.mockReturnValue(configEmbedFields);
			mockGetPermissionsEmbedField.mockResolvedValue(permissionsEmbedField);
		});

		it("responds with an error and otherwise does nothing if no channel was given", async () => {
			mockGetValidChannel.mockImplementation(() => {
				throw new NoTextChannelError("no text channel");
			});
			const game = {
				config: { chatChannel: null },
			} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'set',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(gameChannel, user1, 'chat-channel', options, {});
			await commandSpec.handler(interaction, gameChannel, game);
			expectInteractionResponse(interaction, true);
			expect(game).toHaveProperty('config.chatChannel', null);
		});

		it("doesn't mistake a generic error for not having a text channel", async () => {
			mockGetValidChannel.mockImplementation(() => {
				throw new Error("some other error");
			});
			const game = {
				config: { chatChannel: null },
			} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'set',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(gameChannel, user1, 'chat-channel', options, {});
			await expect(async () => {
				await commandSpec.handler(interaction, gameChannel, game);
			}).rejects.toThrowError();
			expect(game).toHaveProperty('config.chatChannel', null);
		});

		it("rejects the game channel", async () => {
			mockGetValidChannel.mockReturnValue(gameChannel);
			const game = {
				config: { chatChannel: null },
			} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'set',
					options: [
						{
							name: 'channel',
							type: ApplicationCommandOptionType.Channel,
							value: gameChannel.id,
						},
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(gameChannel, user1, 'chat-channel', options, {
				channels: { [gameChannel.id]: gameChannel },
			});
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
					type: ApplicationCommandOptionType.Subcommand,
					name: 'set',
					options: [
						{
							name: 'channel',
							type: ApplicationCommandOptionType.Channel,
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
					type: ApplicationCommandOptionType.Subcommand,
					name: 'set',
					options: [
						{
							name: 'channel',
							type: ApplicationCommandOptionType.Channel,
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
					type: ApplicationCommandOptionType.Subcommand,
					name: 'set',
					options: [
						{
							name: 'channel',
							type: ApplicationCommandOptionType.Channel,
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
					type: ApplicationCommandOptionType.Subcommand,
					name: 'set',
					options: [
						{
							name: 'channel',
							type: ApplicationCommandOptionType.Channel,
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
					type: ApplicationCommandOptionType.Subcommand,
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
					type: ApplicationCommandOptionType.Subcommand,
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
					type: ApplicationCommandOptionType.Subcommand,
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
					type: ApplicationCommandOptionType.Subcommand,
					name: 'unset',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(gameChannel, user1, 'chat-channel', options, {});
			await commandSpec.handler(interaction, gameChannel, game);
			expectInteractionResponse(interaction, true);
		});
	});
});
