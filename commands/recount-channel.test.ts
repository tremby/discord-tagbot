import commandSpec from './recount-channel';
import { getCommandInteraction, getTextChannel, getGuild, getUser, getMessage, getBotUser } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';

import { mocked } from 'ts-jest/utils';

jest.mock('../lib/scoring');
import { recount, getChangedScores, getScoreChangesEmbedField } from '../lib/scoring';
const mockRecount = mocked(recount);
const mockGetChangedScores = mocked(getChangedScores);
const mockGetScoreChangesEmbedField = mocked(getScoreChangesEmbedField);

jest.mock('../lib/game-state');
import { updateGameState, gameStateIsArchived } from '../lib/game-state';
const mockUpdateGameState = mocked(updateGameState);
const mockGameStateIsArchived = mocked(gameStateIsArchived);

const guild = getGuild();
const gameChannel = getTextChannel(guild);
const chatChannel = getTextChannel(guild);
const user1 = getUser('user1');
const tagMessage = getMessage(gameChannel, user1, [], true, false, new Date('2020Z'), "tag");
const statusMessage = getMessage(gameChannel, getBotUser(), [], true, false, new Date('2020Z'), "status");

function getGame(): Game {
	return {
		channel: gameChannel,
		config: {
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
		},
		statusMessage,
		state: {
			status: 'awaiting-match',
			scores: new Map(),
			tag: tagMessage,
		} as GameStateAwaitingMatch,
	};
}

describe("recount-channel command", () => {
	beforeEach(() => {
		mockGameStateIsArchived.mockReturnValue(false);
		mockGetChangedScores.mockReturnValue(new Map());
		mockRecount.mockImplementation(async (game) => ({ ...game.state }));
	});

	it("warns the user it may take time", async () => {
		const game = getGame();
		const interaction = getCommandInteraction(gameChannel, user1, 'recount-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(interaction.deferReply).toHaveBeenCalledTimes(1);
	});

	it("performs a recount", async () => {
		const game = getGame();
		const interaction = getCommandInteraction(gameChannel, user1, 'recount-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockRecount).toHaveBeenCalledTimes(1);
		expect(mockRecount).toHaveBeenCalledWith(game);
	});

	it("does not mutate the game if it was archived", async () => {
		mockGameStateIsArchived.mockReturnValue(true);
		const game = getGame();
		const interaction = getCommandInteraction(gameChannel, user1, 'recount-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockUpdateGameState).not.toHaveBeenCalled();
	});

	it("mutates the game if it was not archived", async () => {
		const game = getGame();
		const interaction = getCommandInteraction(gameChannel, user1, 'recount-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockUpdateGameState).toHaveBeenCalledTimes(1);
	});

	it("responds to the user", async () => {
		const game = getGame();
		const interaction = getCommandInteraction(gameChannel, user1, 'recount-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expectInteractionResponse(interaction, true);
		expect(mockGetScoreChangesEmbedField).toHaveBeenCalledTimes(1);
	});

	it("makes no announcement in the chat channel if one is configured but no scores were changed", async () => {
		const mockSend = jest.spyOn(chatChannel, 'send').mockImplementation();
		const game = getGame();
		game.config.chatChannel = chatChannel;
		const interaction = getCommandInteraction(gameChannel, user1, 'recount-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockSend).not.toHaveBeenCalled();
		expect(mockGetScoreChangesEmbedField).toHaveBeenCalledTimes(1);
	});

	it("makes an announcement in the chat channel if one is configured and scores were changed", async () => {
		mockGetChangedScores.mockReturnValue(new Map([[user1, { before: 0, after: 1 }]]));
		const mockSend = jest.spyOn(chatChannel, 'send').mockImplementation();
		const game = getGame();
		game.config.chatChannel = chatChannel;
		const interaction = getCommandInteraction(gameChannel, user1, 'recount-channel', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockSend).toHaveBeenCalledTimes(1);
		expect(mockGetScoreChangesEmbedField).toHaveBeenCalledTimes(2);
	});
});
