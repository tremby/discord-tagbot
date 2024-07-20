import commandSpec from './init';
import { getCommandInteraction, getTextChannel, getGuild, getUser, getMessage } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';

import { mocked } from 'jest-mock';

jest.mock('../lib/state');
import gameState, { persist } from '../lib/state';
const mockPersist = mocked(persist);

jest.mock('../lib/game-state');
import { getStatusEmbedField } from '../lib/game-state';
const mockGetStatusEmbedField = mocked(getStatusEmbedField);

jest.mock('../lib/config');
import { getDefaultConfig, getConfigEmbedFields } from '../lib/config';
const mockGetDefaultConfig = mocked(getDefaultConfig);
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

jest.mock('../lib/permissions');
import { getPermissionsEmbedField } from '../lib/permissions';
const mockGetPermissionsEmbedField = mocked(getPermissionsEmbedField);

const permissionsEmbedField = {
	name: "Permissions",
	value: "Abcd",
	inline: true,
};

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user1');
const matchMessage = getMessage(channel, user1, [], true, false, new Date('2020Z'), "tag match");

describe("init command", () => {
	beforeEach(() => {
		gameState.games = new Set();
		mockGetConfigEmbedFields.mockReturnValue(configEmbedFields);
		mockGetPermissionsEmbedField.mockResolvedValue(permissionsEmbedField);
		jest.spyOn(console, 'log').mockImplementation();
	});

	it("replies with an ephemeral error and does nothing else if there is already a game", async () => {
		const interaction = getCommandInteraction(channel, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel, {} as Game);
		expectInteractionResponse(interaction, true);
		expect(gameState.games.size).toBe(0); // We faked finding the active game; we're just testing no games got added
	});

	it("gives an ephemeral response on success", async () => {
		const interaction = getCommandInteraction(channel, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel, null);
		expectInteractionResponse(interaction, true);
	});

	it("adds the game to the global state", async () => {
		const interaction = getCommandInteraction(channel, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel, null);
		expect(gameState.games.size).toBe(1);
		const game = [...gameState.games][0];
		expect(game).toHaveProperty('channel', channel);
	});

	it("persists to disk", async () => {
		const interaction = getCommandInteraction(channel, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel, null);
		expect(mockPersist).toHaveBeenCalledTimes(1);
	});

	it("uses the default configuration", async () => {
		const interaction = getCommandInteraction(channel, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel, null);
		expect(mockGetDefaultConfig).toHaveBeenCalledTimes(1);
	});

	it("logs a message with the channel, server, and user", async () => {
		const interaction = getCommandInteraction(channel, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel, null);
		expect(console.log).toHaveBeenCalledTimes(1);
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining(channel.id.toString()));
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining(guild.id.toString()));
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining(user1.id.toString()));
	});
});
