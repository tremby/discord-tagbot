import commandSpec from './clear-chat-channel';
import { getCommandInteraction, getTextChannel, getGuild, getUser, getMessage } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';

import { mocked } from 'ts-jest/utils';

jest.mock('../lib/config');
import { getConfigEmbedFields } from '../lib/config';

const guild = getGuild();
const gameChannel = getTextChannel(guild);
const chatChannel = getTextChannel(guild);
const user1 = getUser('user1');

describe("clear-chat-channel command", () => {
	it("responds with an error and otherwise does nothing if there wasn't a chat channel already", async () => {
		const game = {
			config: { chatChannel: null },
		} as Game;
		const interaction = getCommandInteraction(gameChannel, user1, 'clear-chat-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expectInteractionResponse(interaction, true);
		expect(game).toHaveProperty('config.chatChannel', null);
	});

	it("unregisters the chat channel from configuration", async () => {
		const game = {
			config: { chatChannel },
		} as Game;
		const interaction = getCommandInteraction(gameChannel, user1, 'clear-chat-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(game).toHaveProperty('config.chatChannel', null);
	});

	it("leaves alone any other configuration", async () => {
		const game = {
			config: { nextTagTimeLimit: 42, chatChannel },
		} as Game;
		const interaction = getCommandInteraction(gameChannel, user1, 'clear-chat-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(game).toHaveProperty('config.nextTagTimeLimit', 42);
	});

	it("responds to the user", async () => {
		const game = {
			config: { chatChannel },
		} as Game;
		const interaction = getCommandInteraction(gameChannel, user1, 'clear-chat-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expectInteractionResponse(interaction, true);
	});
});
