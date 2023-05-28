import commandSpec from './recount';
import { getCommandInteraction, getTextChannel, getGuild, getUser, getMessage, getBotUser } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';

import { mocked } from 'jest-mock';

jest.mock('../lib/scoring');
import { recount, getChangedScores, getScoreChangesEmbedField, getScoresEmbedFields } from '../lib/scoring';
const mockRecount = mocked(recount);
const mockGetChangedScores = mocked(getChangedScores);
const mockGetScoreChangesEmbedField = mocked(getScoreChangesEmbedField);
const mockGetScoresEmbedFields = mocked(getScoresEmbedFields);

jest.mock('../lib/game-state');
import { updateGameState, gameStateIsInactive } from '../lib/game-state';
const mockUpdateGameState = mocked(updateGameState);
const mockGameStateIsInactive = mocked(gameStateIsInactive);

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
			autoRestart: false,
			period: null,
			locale: 'UTC',
			rankingStrategy: 'standardCompetition',
		},
		statusMessage,
		state: {
			status: 'awaiting-match',
			scores: new Map(),
			tag: tagMessage,
		} as GameStateAwaitingMatch,
	};
}

describe("recount command", () => {
	beforeEach(() => {
		mockGameStateIsInactive.mockReturnValue(false);
		mockGetChangedScores.mockReturnValue(new Map());
		mockRecount.mockImplementation(async (game) => ({ ...game.state } as GameState));
		mockGetScoresEmbedFields.mockReturnValue([]);
	});

	it("warns the user it may take time", async () => {
		const game = getGame();
		const interaction = getCommandInteraction(gameChannel, user1, 'recount', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(interaction.deferReply).toHaveBeenCalledTimes(1);
	});

	it("performs a recount", async () => {
		const game = getGame();
		const interaction = getCommandInteraction(gameChannel, user1, 'recount', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockRecount).toHaveBeenCalledTimes(1);
		expect(mockRecount).toHaveBeenCalledWith(game);
	});

	it("does nothing if the game is inactive", async () => {
		mockGameStateIsInactive.mockReturnValue(true);
		const game = getGame();
		const interaction = getCommandInteraction(gameChannel, user1, 'recount', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockRecount).not.toHaveBeenCalled();
		expect(mockUpdateGameState).not.toHaveBeenCalled();
	});

	it("mutates the game if it was not inactive", async () => {
		const game = getGame();
		const interaction = getCommandInteraction(gameChannel, user1, 'recount', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockUpdateGameState).toHaveBeenCalledTimes(1);
	});

	it("responds to the user", async () => {
		const game = getGame();
		const interaction = getCommandInteraction(gameChannel, user1, 'recount', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expectInteractionResponse(interaction, true);
		expect(mockGetScoreChangesEmbedField).toHaveBeenCalledTimes(1);
	});

	it("makes no announcement in the chat channel if one is configured but no scores were changed", async () => {
		const mockSend = jest.spyOn(chatChannel, 'send').mockImplementation();
		const game = getGame();
		game.config.chatChannel = chatChannel;
		const interaction = getCommandInteraction(gameChannel, user1, 'recount', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockSend).not.toHaveBeenCalled();
		expect(mockGetScoreChangesEmbedField).toHaveBeenCalledTimes(1);
	});

	it("makes an announcement in the chat channel if one is configured and scores were changed", async () => {
		mockGetChangedScores.mockReturnValue(new Map([[user1, { before: 0, after: 1 }]]));
		const mockSend = jest.spyOn(chatChannel, 'send').mockImplementation();
		const game = getGame();
		game.config.chatChannel = chatChannel;
		const interaction = getCommandInteraction(gameChannel, user1, 'recount', [], {});
		await commandSpec.handler(interaction, gameChannel, game);
		expect(mockSend).toHaveBeenCalledTimes(1);
		expect(mockGetScoreChangesEmbedField).toHaveBeenCalledTimes(2);
	});
});
