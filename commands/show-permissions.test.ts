import commandSpec from './show-permissions';
import { getCommandInteraction, getTextChannel, getGuild, getUser } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';
import { Constants } from 'discord.js';
import type { APIApplicationCommandInteractionDataOption } from 'discord-api-types/v10';

import { mocked } from 'jest-mock';

jest.mock('../lib/permissions');
import { getPermissionsEmbedField, PermissionStatus } from '../lib/permissions';
const mockGetPermissionsEmbedField = mocked(getPermissionsEmbedField);

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user1');
const game = { channel } as Game;

describe("show-permissions command", () => {
	beforeEach(() => {
		mockGetPermissionsEmbedField.mockResolvedValue({ inline: true, name: "Field", value: "Value" });
	});

	it("calls getPermissionsEmbedField with the current guild", async () => {
		const interaction = getCommandInteraction(channel, user1, 'permissions', [], {});
		await commandSpec.handler(interaction, channel, game);
		expect(mockGetPermissionsEmbedField).toHaveBeenCalledTimes(1);
		expect(mockGetPermissionsEmbedField).toHaveBeenCalledWith(guild);
	});

	it("responds to the user", async () => {
		const game = {} as Game;
		const interaction = getCommandInteraction(channel, user1, 'permissions', [], {});
		await commandSpec.handler(interaction, channel, game);
		expectInteractionResponse(interaction, true);
	});
});
