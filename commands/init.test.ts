import commandSpec from './init';
import { getCommandInteraction, getTextChannel, getGuild, getUser, getMessage } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';

import { mocked } from 'ts-jest/utils';

jest.mock('../lib/state');
import gameState, { persistToDisk } from '../lib/state';
const mockPersistToDisk = mocked(persistToDisk);

jest.mock('../lib/game-state');
import { getStatusEmbedField } from '../lib/game-state';
const mockGetStatusEmbedField = mocked(getStatusEmbedField);

jest.mock('../lib/config');
import { getDefaultConfig, getConfigEmbedFields } from '../lib/config';
const mockGetDefaultConfig = mocked(getDefaultConfig);
const mockGetConfigEmbedFields = mocked(getConfigEmbedFields);

jest.mock('../lib/scoring');
import { getScoresEmbedField } from '../lib/scoring';
const mockGetScoresEmbedField = mocked(getScoresEmbedField);

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

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user1');
const matchMessage = getMessage(channel, user1, [], true, false, new Date('2020Z'), "tag match");

describe("init command", () => {
	beforeEach(() => {
		gameState.games = new Set();
		mockGetConfigEmbedFields.mockReturnValue(configEmbedFields);
	});

	it("replies with an ephemeral error and does nothing else if there is already a game", async () => {
		const interaction = getCommandInteraction(channel, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel, {} as Game);
		expectInteractionResponse(interaction, true);
		expect(gameState.games.size).toBe(0); // We faked finding the active game; we're just testing no games got added
	});

	it("gives an ephemeral response on success", async () => {
		const interaction = getCommandInteraction(channel, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel);
		expectInteractionResponse(interaction, true);
	});

	it("adds the game to the global state", async () => {
		const interaction = getCommandInteraction(channel, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel);
		expect(gameState.games.size).toBe(1);
		const game = [...gameState.games][0];
		expect(game).toHaveProperty('channel', channel);
	});

	it("persists to disk", async () => {
		const interaction = getCommandInteraction(channel, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel);
		expect(mockPersistToDisk).toHaveBeenCalledTimes(1);
	});

	it("uses the default configuration", async () => {
		const interaction = getCommandInteraction(channel, user1, 'init', [], {});
		await commandSpec.handler(interaction, channel);
		expect(mockGetDefaultConfig).toHaveBeenCalledTimes(1);
	});
});
