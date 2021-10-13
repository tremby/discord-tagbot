import commandSpec from './archive-channel';
import { getCommandInteraction, getTextChannel, getGuild, getUser, getMessage, getBotUser } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';

import { mocked } from 'ts-jest/utils';

jest.mock('../lib/game-state');
import { updateGameState, gameStateIsArchived } from '../lib/game-state';
const mockGameStateIsArchived = mocked(gameStateIsArchived);
const mockUpdateGameState = mocked(updateGameState);

jest.mock('../lib/scoring');

const guild = getGuild();
const gameChannel = getTextChannel(guild);
const chatChannel = getTextChannel(guild);
const user1 = getUser('user1');
const statusMessage = getMessage(gameChannel, getBotUser(), [], false, true, new Date('2020Z'), "status");

describe("archive-channel command", () => {
	it("replies with an error and otherwise does nothing if the game is already archived", async () => {
		mockGameStateIsArchived.mockReturnValue(true);
		const interaction = getCommandInteraction(gameChannel, user1, 'archive-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, {} as Game);
		expectInteractionResponse(interaction, true);
		expect(mockUpdateGameState).not.toHaveBeenCalled();
	});

	it("updates the game state", async () => {
		mockGameStateIsArchived.mockReturnValue(false);
		const interaction = getCommandInteraction(gameChannel, user1, 'archive-channel', [], {});
		const game = { config: {}, state: {} } as Game;
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockUpdateGameState).toHaveBeenCalledTimes(1);
		expect(mockUpdateGameState).toHaveBeenCalledWith(game, expect.objectContaining({ status: 'archived' }));
	});

	it("persists the existing scores", async () => {
		mockGameStateIsArchived.mockReturnValue(false);
		const interaction = getCommandInteraction(gameChannel, user1, 'archive-channel', [], {});
		const scores = new Map();
		const game = { config: {}, state: { scores } } as Game;
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockUpdateGameState).toHaveBeenCalledTimes(1);
		expect(mockUpdateGameState.mock.calls[0][1].scores).toBe(scores);
	});

	it("makes an announcement in the chat channel if there is one", async () => {
		mockGameStateIsArchived.mockReturnValue(false);
		const mockSend = jest.spyOn(chatChannel, 'send').mockImplementation();
		const interaction = getCommandInteraction(gameChannel, user1, 'archive-channel', [], {});
		const game = { config: { chatChannel }, state: {} } as Game;
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockSend).toHaveBeenCalledTimes(1);
	});

	it("links to the status message in the announcement if possible", async () => {
		mockGameStateIsArchived.mockReturnValue(false);
		const mockSend = jest.spyOn(chatChannel, 'send').mockImplementation();
		const interaction = getCommandInteraction(gameChannel, user1, 'archive-channel', [], {});
		const game = { statusMessage, config: { chatChannel }, state: {} } as Game;
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockSend).toHaveBeenCalledTimes(1);
		expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
			embeds: expect.arrayContaining([
				expect.objectContaining({
					fields: expect.arrayContaining([
						expect.objectContaining({
							value: expect.stringContaining(statusMessage.url),
						}),
					]),
				}),
			]),
		}));
	});

	it("responds to the user", async () => {
		mockGameStateIsArchived.mockReturnValue(false);
		const mockSend = jest.spyOn(chatChannel, 'send').mockImplementation();
		const interaction = getCommandInteraction(gameChannel, user1, 'archive-channel', [], {});
		const game = { config: { chatChannel }, state: {} } as Game;
		await commandSpec.handler(interaction, gameChannel, game);
		expectInteractionResponse(interaction, true);
	});
});
