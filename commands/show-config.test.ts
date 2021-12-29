import commandSpec from './show-config';
import { getCommandInteraction, getTextChannel, getGuild, getUser } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';
import { Constants } from 'discord.js';
import type { APIApplicationCommandInteractionDataOption } from 'discord-api-types';

import { mocked } from 'ts-jest/utils';

jest.mock('../lib/config');
import { getConfigEmbedFields } from '../lib/config';
const mockGetConfigEmbedFields = mocked(getConfigEmbedFields);

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user1');

describe("show-config command", () => {
	beforeEach(() => {
		mockGetConfigEmbedFields.mockReturnValue([]);
	});

	it("calls getConfigEmbedFields with the configuration of the current game", async () => {
		const config = {} as Config;
		const game = { config } as Game;
		const interaction = getCommandInteraction(channel, user1, 'config', [], {});
		await commandSpec.handler(interaction, channel, game);
		expect(mockGetConfigEmbedFields).toHaveBeenCalledTimes(1);
		expect(mockGetConfigEmbedFields).toHaveBeenCalledWith(config);
	});

	it("responds to the user", async () => {
		const game = {} as Game;
		const interaction = getCommandInteraction(channel, user1, 'config', [], {});
		await commandSpec.handler(interaction, channel, game);
		expectInteractionResponse(interaction, true);
	});
});
