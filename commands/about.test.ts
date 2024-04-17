import commandSpec from './about';
import { getCommandInteraction, getTextChannel, getGuild, getUser } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';
import { Constants } from 'discord.js';
import type { APIApplicationCommandInteractionDataOption } from 'discord-api-types/v10';

import { mocked } from 'jest-mock';

jest.mock('../lib/config');

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user1');

describe("about command", () => {
	it("responds to the user", async () => {
		const interaction = getCommandInteraction(channel, user1, 'about', [], {});
		await commandSpec.handler(interaction, channel, null);
		expectInteractionResponse(interaction, true);
	});
});
