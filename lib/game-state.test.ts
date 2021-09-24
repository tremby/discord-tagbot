import * as m from './game-state';
import { getGuild, getTextChannel, getUser, getMessage } from '../test/fixtures';

import { DiscordAPIError, Constants } from 'discord.js';

import { mocked } from 'ts-jest/utils';

jest.mock('./scoring');
import { getScoresEmbedField } from './scoring';
const mockGetScoresEmbedField = mocked(getScoresEmbedField);

jest.mock('./timers');
import { clearTimers, setTimers } from './timers';
const mockClearTimers = mocked(clearTimers);
const mockSetTimers = mocked(setTimers);

jest.mock('./channel');
import { getStatusMessage } from './channel';
const mockGetStatusMessage = mocked(getStatusMessage);

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user-1');
const user2 = getUser('user-2');
const user3 = getUser('user-3');
const botUser = getUser('bot-user');
const tagMessage = getMessage(channel, user1, [user2, user3], true, false, new Date('2020Z'), "tag");
const matchMessage = getMessage(channel, user1, [user2, user3], true, false, new Date('2020Z'), "tag match");
const statusMessage = getMessage(channel, botUser, [], false, true, new Date('2020Z'), "status");

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
			expect(m.gameStateIsFree(stateFree)).toBe(true);
		});

		it("rejects other states", () => {
			expect(m.gameStateIsFree(stateAwaitingNext)).toBe(false);
			expect(m.gameStateIsFree(stateAwaitingMatch)).toBe(false);
			expect(m.gameStateIsFree(stateArchived)).toBe(false);
		});
	});

	describe("gameStateIsAwaitingNext", () => {
		it("accepts the matching state", () => {
			expect(m.gameStateIsAwaitingNext(stateAwaitingNext)).toBe(true);
		});

		it("rejects other states", () => {
			expect(m.gameStateIsAwaitingNext(stateFree)).toBe(false);
			expect(m.gameStateIsAwaitingNext(stateAwaitingMatch)).toBe(false);
			expect(m.gameStateIsAwaitingNext(stateArchived)).toBe(false);
		});
	});

	describe("gameStateIsAwaitingMatch", () => {
		it("accepts the matching state", () => {
			expect(m.gameStateIsAwaitingMatch(stateAwaitingMatch)).toBe(true);
		});

		it("rejects other states", () => {
			expect(m.gameStateIsAwaitingMatch(stateFree)).toBe(false);
			expect(m.gameStateIsAwaitingMatch(stateAwaitingNext)).toBe(false);
			expect(m.gameStateIsAwaitingMatch(stateArchived)).toBe(false);
		});
	});

	describe("gameStateIsArchived", () => {
		it("accepts the matching state", () => {
			expect(m.gameStateIsArchived(stateArchived)).toBe(true);
		});

		it("rejects other states", () => {
			expect(m.gameStateIsArchived(stateFree)).toBe(false);
			expect(m.gameStateIsArchived(stateAwaitingNext)).toBe(false);
			expect(m.gameStateIsArchived(stateAwaitingMatch)).toBe(false);
		});
	});
});

describe("formatGameStatus", () => {
	beforeEach(() => {
		jest.spyOn(m, 'gameStateIsArchived').mockReturnValue(false);
		jest.spyOn(m, 'gameStateIsAwaitingMatch').mockReturnValue(false);
		jest.spyOn(m, 'gameStateIsAwaitingNext').mockReturnValue(false);
		jest.spyOn(m, 'gameStateIsFree').mockReturnValue(false);
	});

	it("detects an archived game", () => {
		jest.spyOn(m, 'gameStateIsArchived').mockReturnValue(true);
		expect(m.formatGameStatus(gameWithState({} as GameState))).toContain("Archived");
	});

	it("detects a game awaiting a match", () => {
		jest.spyOn(m, 'gameStateIsAwaitingMatch').mockReturnValue(true);
		expect(m.formatGameStatus(gameWithState(stateAwaitingMatch))).toContain("Awaiting tag match");
	});

	it("detects a game awaiting a new followup tag", () => {
		jest.spyOn(m, 'gameStateIsAwaitingNext').mockReturnValue(true);
		expect(m.formatGameStatus(gameWithState(stateAwaitingNext))).toContain("Awaiting next tag");
	});

	it("detects a free game", () => {
		jest.spyOn(m, 'gameStateIsFree').mockReturnValue(true);
		expect(m.formatGameStatus(gameWithState(stateFree))).toContain("Awaiting first tag");
	});

	it("lists the current tag authors when awaiting a match", () => {
		jest.spyOn(m, 'gameStateIsAwaitingMatch').mockReturnValue(true);
		expect(m.formatGameStatus(gameWithState(stateAwaitingMatch))).toContain("<@user-1>");
		expect(m.formatGameStatus(gameWithState(stateAwaitingMatch))).toContain("<@user-2>");
		expect(m.formatGameStatus(gameWithState(stateAwaitingMatch))).toContain("<@user-3>");
	});

	it("lists the match authors when awaiting a new tag", () => {
		jest.spyOn(m, 'gameStateIsAwaitingNext').mockReturnValue(true);
		expect(m.formatGameStatus(gameWithState(stateAwaitingNext))).toContain("<@user-1>");
		expect(m.formatGameStatus(gameWithState(stateAwaitingNext))).toContain("<@user-2>");
		expect(m.formatGameStatus(gameWithState(stateAwaitingNext))).toContain("<@user-3>");
	});
});

describe("getStatusEmbedField", () => {
	beforeEach(() => {
		jest.spyOn(m, 'formatGameStatus').mockReturnValue("mock-status");
	});

	it("has a name", () => {
		const response = m.getStatusEmbedField(gameWithState(stateAwaitingNext));
		expect(response).toHaveProperty('name');
	});

	it("has the message from formatGameStatus as its value", () => {
		const game = gameWithState(stateAwaitingNext);
		const response = m.getStatusEmbedField(game);
		expect(response).toHaveProperty('value', "mock-status");
	});
});

describe("formatGameStatusMessage", () => {
	beforeEach(() => {
		jest.spyOn(m, 'getStatusEmbedField').mockReturnValue({ name: "mock-name", value: "mock-value" });
	});

	it("gives a single embed", () => {
		const response = m.formatGameStatusMessage(gameWithState(stateAwaitingNext));
		expect(response).toHaveProperty('embeds');
		expect(response.embeds).toHaveLength(1);
	});

	it("has a title", () => {
		const response = m.formatGameStatusMessage(gameWithState(stateAwaitingNext));
		expect(response).toHaveProperty('embeds.0.title');
	});

	it("has a field for the status", () => {
		const game = gameWithState(stateAwaitingNext);
		const response = m.formatGameStatusMessage(game);
		expect(response).toHaveProperty('embeds.0.fields', expect.arrayContaining([{ name: "mock-name", value: "mock-value" }]));
	});

	it("has a field for the scores", () => {
		mockGetScoresEmbedField.mockImplementation((game, type) => ({ name: 'n', value: 'v' }));
		const game = gameWithState(stateAwaitingNext);
		const response = m.formatGameStatusMessage(game);
		expect(getScoresEmbedField).toHaveBeenCalledTimes(1);
		expect(getScoresEmbedField).toHaveBeenCalledWith(game, expect.anything());
		expect(response).toHaveProperty('embeds.0.fields', expect.arrayContaining([mockGetScoresEmbedField.mock.results[0].value]));
	});
});

describe("updateGameStatusMessage", () => {
	const game = gameWithState(stateAwaitingNext);
	const error = new DiscordAPIError({ code: Constants.APIErrors.UNKNOWN_MESSAGE }, 400, { options: { data: {} }});

	beforeEach(() => {
		jest.spyOn(m, 'formatGameStatusMessage').mockReturnValue({ content: "mock-message" });
		jest.spyOn(channel, 'send').mockResolvedValue(statusMessage);
		jest.spyOn(statusMessage, 'pin').mockResolvedValue(null);
		jest.spyOn(statusMessage, 'edit').mockResolvedValue(null);
	});

	it("tries to find the status message if it doesn't already have one", async () => {
		await m.updateGameStatusMessage({ ...game });
		expect(mockGetStatusMessage).toHaveBeenCalledTimes(1);
		expect(mockGetStatusMessage).toHaveBeenCalledWith(channel);
	});

	it("does not try to find the status message if it already has one", async () => {
		await m.updateGameStatusMessage({ ...game, statusMessage });
		expect(mockGetStatusMessage).not.toHaveBeenCalled();
	});

	it("attempts to edit a status message to the new message if it has one", async () => {
		await m.updateGameStatusMessage({ ...game, statusMessage });
		expect(statusMessage.edit).toHaveBeenCalledTimes(1);
		expect(statusMessage.edit).toHaveBeenCalledWith({ content: "mock-message" });
	});

	it("attempts to edit a status message to the new message if it finds one", async () => {
		mockGetStatusMessage.mockResolvedValue(statusMessage);
		await m.updateGameStatusMessage({ ...game });
		expect(statusMessage.edit).toHaveBeenCalledTimes(1);
		expect(statusMessage.edit).toHaveBeenCalledWith({ content: "mock-message" });
	});

	it("silently ignores the error if Discord can't find the message to edit it", async () => {
		jest.spyOn(statusMessage, 'edit').mockRejectedValue(error);
		await expect(async () => {
			await m.updateGameStatusMessage({ ...game });
		}).not.toThrow();
	});

	it("sends and pins a new message if none was found", async () => {
		await m.updateGameStatusMessage({ ...game });
		expect(mockGetStatusMessage).toHaveBeenCalledTimes(1);
		expect(channel.send).toHaveBeenCalledTimes(1);
		expect(channel.send).toHaveBeenCalledWith({ content: "mock-message" });
		expect(statusMessage.pin).toHaveBeenCalledTimes(1);
	});

	it("sends and pins a new message if it failed to edit an existing one", async () => {
		jest.spyOn(statusMessage, 'edit').mockRejectedValue(error);
		await m.updateGameStatusMessage({ ...game });
		expect(channel.send).toHaveBeenCalledTimes(1);
		expect(channel.send).toHaveBeenCalledWith({ content: "mock-message" });
		expect(statusMessage.pin).toHaveBeenCalledTimes(1);
	});

	it("does not send a new message or pin anything if an edit succeeded", async () => {
		mockGetStatusMessage.mockResolvedValue(statusMessage);
		await m.updateGameStatusMessage({ ...game });
		expect(channel.send).not.toHaveBeenCalled();
		expect(statusMessage.pin).not.toHaveBeenCalled();
	});
});

describe("updateGameState", () => {
	it("clears timers then sets new timers, in that order", async () => {
		const mockUpdateGameStatusMessage = jest.spyOn(m, 'updateGameStatusMessage').mockImplementation(async () => {});
		const calls = [];
		mockClearTimers.mockImplementation(() => calls.push('clear'));
		mockSetTimers.mockImplementation(() => calls.push('set'));
		await m.updateGameState(gameWithState(stateAwaitingNext), stateAwaitingMatch);
		expect(mockClearTimers).toHaveBeenCalledTimes(1);
		expect(mockSetTimers).toHaveBeenCalledTimes(1);
		expect(calls[0]).toBe('clear');
		expect(calls[1]).toBe('set');
	});

	it("sets the game state", async () => {
		const mockUpdateGameStatusMessage = jest.spyOn(m, 'updateGameStatusMessage').mockImplementation(async () => {});
		mockClearTimers.mockImplementation(() => {});
		mockSetTimers.mockImplementation(() => {});
		const game = gameWithState(stateAwaitingNext);
		await m.updateGameState(game, stateAwaitingMatch);
		expect(game.state).toBe(stateAwaitingMatch);
	});

	it("updates the status message", async () => {
		const mockUpdateGameStatusMessage = jest.spyOn(m, 'updateGameStatusMessage').mockImplementation(async () => {});
		mockClearTimers.mockImplementation(() => {});
		mockSetTimers.mockImplementation(() => {});
		const game = gameWithState(stateAwaitingNext);
		await m.updateGameState(game, stateAwaitingMatch);
		expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
		expect(mockUpdateGameStatusMessage).toHaveBeenCalledWith(game);
	});
});
