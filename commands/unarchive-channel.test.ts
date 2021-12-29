import commandSpec from './unarchive-channel';
import { getCommandInteraction, getTextChannel, getGuild, getUser, getMessage, getBotUser } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';

import { mocked } from 'ts-jest/utils';

jest.mock('../lib/scoring');
import { recount } from '../lib/scoring';
const mockRecount = mocked(recount);

jest.mock('../lib/game-state');
import { updateGameState, getStatusEmbedField, gameStateIsArchived } from '../lib/game-state';
const mockGameStateIsArchived = mocked(gameStateIsArchived);
const mockGetStatusEmbedField = mocked(getStatusEmbedField);
const mockUpdateGameState = mocked(updateGameState);

const guild = getGuild();
const gameChannel = getTextChannel(guild);
const chatChannel = getTextChannel(guild);
const user1 = getUser('user1');

describe("unarchive-channel command", () => {
	beforeEach(() => {
		mockRecount.mockResolvedValue({} as GameState);
		mockUpdateGameState.mockResolvedValue(null);
	});

	it("replies with an error and otherwise does nothing if the game is not already archived", async () => {
		mockGameStateIsArchived.mockReturnValue(false);
		const interaction = getCommandInteraction(gameChannel, user1, 'unarchive-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, {} as Game);
		expectInteractionResponse(interaction, true);
		expect(mockRecount).not.toHaveBeenCalled();
		expect(mockUpdateGameState).not.toHaveBeenCalled();
	});

	it("causes a recount", async () => {
		mockGameStateIsArchived.mockReturnValue(true);
		const interaction = getCommandInteraction(gameChannel, user1, 'unarchive-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, {} as Game);
		expect(mockRecount).toHaveBeenCalledTimes(1);
	});

	it("updates the game state to the result of the recount", async () => {
		const game = {} as Game;
		const newState = { status: 'awaiting-next' } as GameState;
		mockRecount.mockResolvedValue(newState);
		mockGameStateIsArchived.mockReturnValue(true);
		const interaction = getCommandInteraction(gameChannel, user1, 'unarchive-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockUpdateGameState).toHaveBeenCalledWith(game, newState);
	});

	it("responds to the user on success", async () => {
		mockGameStateIsArchived.mockReturnValue(true);
		const interaction = getCommandInteraction(gameChannel, user1, 'unarchive-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, {} as Game);
		expectInteractionResponse(interaction, true);
	});

	it("shows the new status", async () => {
		const game = {} as Game;
		mockGameStateIsArchived.mockReturnValue(true);
		const interaction = getCommandInteraction(gameChannel, user1, 'unarchive-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockGetStatusEmbedField).toHaveBeenCalledTimes(1);
		expect(mockGetStatusEmbedField).toHaveBeenCalledWith(game);
	});
});
