import {
	gameStateIsFree,
	gameStateIsAwaitingNext,
	gameStateIsAwaitingMatch,
	gameStateIsArchived,
	formatGameStatus,
	getStatusEmbedField,
	formatGameStatusMessage,
} from './game-state';
import { getGuild, getTextChannel, getUser, getMessage } from '../test/fixtures';

import { mocked } from 'ts-jest/utils';
jest.mock('./scoring');
import { getScoresEmbedField } from './scoring';
const mockGetScoresEmbedField = mocked(getScoresEmbedField);

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user-1');
const user2 = getUser('user-2');
const user3 = getUser('user-3');
const tagMessage = getMessage(channel, user1, [user2, user3], true, false, new Date('2020Z'), "tag");
const matchMessage = getMessage(channel, user1, [user2, user3], true, false, new Date('2020Z'), "tag match");

const stateFree: GameStateFree = {
	status: 'free',
	scores: new Map(),
};
const stateAwaitingNext: GameStateAwaitingNext = {
	status: 'awaiting-next',
	scores: new Map(),
	match: matchMessage,
	reminderTimer: null,
	timeUpTimer: null,
};
const stateAwaitingMatch: GameStateAwaitingMatch = {
	status: 'awaiting-match',
	scores: new Map(),
	tag: tagMessage,
};
const stateArchived: GameStateArchived = {
	status: 'archived',
	scores: null,
};

function gameWithState(state: GameState): Game {
	return {
		channel,
		config: {
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
		},
		statusMessage: null,
		state,
	};
}

describe("GameState discriminators", () => {
	describe("gameStateIsFree", () => {
		it("accepts the matching state", () => {
			expect(gameStateIsFree(stateFree)).toBe(true);
		});

		it("rejects other states", () => {
			expect(gameStateIsFree(stateAwaitingNext)).toBe(false);
			expect(gameStateIsFree(stateAwaitingMatch)).toBe(false);
			expect(gameStateIsFree(stateArchived)).toBe(false);
		});
	});

	describe("gameStateIsAwaitingNext", () => {
		it("accepts the matching state", () => {
			expect(gameStateIsAwaitingNext(stateAwaitingNext)).toBe(true);
		});

		it("rejects other states", () => {
			expect(gameStateIsAwaitingNext(stateFree)).toBe(false);
			expect(gameStateIsAwaitingNext(stateAwaitingMatch)).toBe(false);
			expect(gameStateIsAwaitingNext(stateArchived)).toBe(false);
		});
	});

	describe("gameStateIsAwaitingMatch", () => {
		it("accepts the matching state", () => {
			expect(gameStateIsAwaitingMatch(stateAwaitingMatch)).toBe(true);
		});

		it("rejects other states", () => {
			expect(gameStateIsAwaitingMatch(stateFree)).toBe(false);
			expect(gameStateIsAwaitingMatch(stateAwaitingNext)).toBe(false);
			expect(gameStateIsAwaitingMatch(stateArchived)).toBe(false);
		});
	});

	describe("gameStateIsArchived", () => {
		it("accepts the matching state", () => {
			expect(gameStateIsArchived(stateArchived)).toBe(true);
		});

		it("rejects other states", () => {
			expect(gameStateIsArchived(stateFree)).toBe(false);
			expect(gameStateIsArchived(stateAwaitingNext)).toBe(false);
			expect(gameStateIsArchived(stateAwaitingMatch)).toBe(false);
		});
	});
});

describe("formatGameStatus", () => {
	it("returns the expected state message", () => {
		expect(formatGameStatus(gameWithState(stateArchived))).toContain("Archived");
		expect(formatGameStatus(gameWithState(stateAwaitingMatch))).toContain("Awaiting tag match");
		expect(formatGameStatus(gameWithState(stateAwaitingNext))).toContain("Awaiting next tag");
		expect(formatGameStatus(gameWithState(stateFree))).toContain("Awaiting first tag");
	});

	it("lists the current tag authors when awaiting a match", () => {
		expect(formatGameStatus(gameWithState(stateAwaitingMatch))).toContain("<@user-1>");
		expect(formatGameStatus(gameWithState(stateAwaitingMatch))).toContain("<@user-2>");
		expect(formatGameStatus(gameWithState(stateAwaitingMatch))).toContain("<@user-3>");
	});

	it("lists the match authors when awaiting a new tag", () => {
		expect(formatGameStatus(gameWithState(stateAwaitingNext))).toContain("<@user-1>");
		expect(formatGameStatus(gameWithState(stateAwaitingNext))).toContain("<@user-2>");
		expect(formatGameStatus(gameWithState(stateAwaitingNext))).toContain("<@user-3>");
	});
});

describe("getStatusEmbedField", () => {
	it("has a name", () => {
		const response = getStatusEmbedField(gameWithState(stateAwaitingNext));
		expect(response).toHaveProperty('name');
	});

	it("has the message from formatGameStatus as its value", () => {
		const game = gameWithState(stateAwaitingNext);
		const response = getStatusEmbedField(game);
		expect(response).toHaveProperty('value', formatGameStatus(game));
	});
});

describe("formatGameStatusMessage", () => {
	it("gives a single embed", () => {
		const response = formatGameStatusMessage(gameWithState(stateAwaitingNext));
		expect(response).toHaveProperty('embeds');
		expect(response.embeds).toHaveLength(1);
	});

	it("has a title", () => {
		const response = formatGameStatusMessage(gameWithState(stateAwaitingNext));
		expect(response).toHaveProperty('embeds.0.title');
	});

	it("has a field for the status", () => {
		const game = gameWithState(stateAwaitingNext);
		const response = formatGameStatusMessage(game);
		const field = getStatusEmbedField(game);
		expect(response).toHaveProperty('embeds.0.fields', expect.arrayContaining([field]));
	});

	it("has a field for the scores", () => {
		mockGetScoresEmbedField.mockImplementation((game, type) => ({ name: 'n', value: 'v' }));
		const game = gameWithState(stateAwaitingNext);
		const response = formatGameStatusMessage(game);
		expect(getScoresEmbedField).toHaveBeenCalledTimes(1);
		expect(getScoresEmbedField).toHaveBeenCalledWith(game, expect.anything());
		expect(response).toHaveProperty('embeds.0.fields', expect.arrayContaining([mockGetScoresEmbedField.mock.results[0].value]));
	});
});

// TODO: updateGameStatusMessage
// TODO: updateGameState
