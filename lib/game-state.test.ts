import * as m from './game-state';
import type { User, Embed } from 'discord.js';
import { getGuild, getTextChannel, getUser, getMessage } from '../test/fixtures';

import { DiscordAPIError, Constants } from 'discord.js';

import { mocked } from 'jest-mock';

jest.mock('./scoring');
import { getScoresEmbedFields } from './scoring';
const mockGetScoresEmbedFields = mocked(getScoresEmbedFields);

jest.mock('./timers');
import { clearTimers, setTimers } from './timers';
const mockClearTimers = mocked(clearTimers);
const mockSetTimers = mocked(setTimers);

jest.mock('./string');
import { toList } from './string';
const mockToList = mocked(toList);

jest.mock('./state');
import { persist } from './state';
const mockPersist = mocked(persist);

const guild = getGuild();
const channel = getTextChannel(guild);
const chatChannel = getTextChannel(guild);
const user1 = getUser('100');
const user2 = getUser('200');
const user3 = getUser('300');
const user4 = getUser('400');
const botUser = getUser('bot-user');
const tagMessage = getMessage(channel, user1, [user2, user3], true, false, new Date('2020Z'), "tag");
const matchMessage = getMessage(channel, user1, [user2, user3], true, false, new Date('2020Z'), "tag match");
const statusMessage = getMessage(channel, botUser, [], false, true, new Date('2020Z'), "status");
const chatMessage = getMessage(chatChannel, botUser, [], false, false, new Date('2020Z'), "chat announcement");
const resultsMessage = getMessage(channel, botUser, [], false, true, new Date('2020Z'), "results");

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
	disqualifiedFromRound: new Set(),
};
const stateAwaitingMatch: GameStateAwaitingMatch = {
	status: 'awaiting-match',
	scores: new Map(),
	tag: tagMessage,
	disqualifiedFromRound: new Set(),
};
const stateInactive: GameStateInactive = {
	status: 'inactive',
};

function gameWithState(state: GameState): Game {
	return {
		channel,
		config: {
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
			autoRestart: false,
			period: null,
			locale: 'UTC',
			rankingStrategy: 'standardCompetition',
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
			expect(m.gameStateIsFree(stateInactive)).toBe(false);
		});
	});

	describe("gameStateIsAwaitingNext", () => {
		it("accepts the matching state", () => {
			expect(m.gameStateIsAwaitingNext(stateAwaitingNext)).toBe(true);
		});

		it("rejects other states", () => {
			expect(m.gameStateIsAwaitingNext(stateFree)).toBe(false);
			expect(m.gameStateIsAwaitingNext(stateAwaitingMatch)).toBe(false);
			expect(m.gameStateIsAwaitingNext(stateInactive)).toBe(false);
		});
	});

	describe("gameStateIsAwaitingMatch", () => {
		it("accepts the matching state", () => {
			expect(m.gameStateIsAwaitingMatch(stateAwaitingMatch)).toBe(true);
		});

		it("rejects other states", () => {
			expect(m.gameStateIsAwaitingMatch(stateFree)).toBe(false);
			expect(m.gameStateIsAwaitingMatch(stateAwaitingNext)).toBe(false);
			expect(m.gameStateIsAwaitingMatch(stateInactive)).toBe(false);
		});
	});

	describe("gameStateIsInactive", () => {
		it("accepts the matching state", () => {
			expect(m.gameStateIsInactive(stateInactive)).toBe(true);
		});

		it("rejects other states", () => {
			expect(m.gameStateIsInactive(stateFree)).toBe(false);
			expect(m.gameStateIsInactive(stateAwaitingNext)).toBe(false);
			expect(m.gameStateIsInactive(stateAwaitingMatch)).toBe(false);
		});
	});
});

describe("formatGameStatus", () => {
	beforeEach(() => {
		jest.spyOn(m, 'gameStateIsInactive').mockReturnValue(false);
		jest.spyOn(m, 'gameStateIsAwaitingMatch').mockReturnValue(false);
		jest.spyOn(m, 'gameStateIsAwaitingNext').mockReturnValue(false);
		jest.spyOn(m, 'gameStateIsFree').mockReturnValue(false);
		mockToList.mockImplementation((strings: User[] | Set<User>) => [...strings].join(", "));
	});

	it("detects an inactive game", () => {
		jest.spyOn(m, 'gameStateIsInactive').mockReturnValue(true);
		expect(m.formatGameStatus(gameWithState({} as GameState))).toContain("Inactive");
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
		expect(m.formatGameStatus(gameWithState(stateAwaitingMatch))).toContain("<@100>");
		expect(m.formatGameStatus(gameWithState(stateAwaitingMatch))).toContain("<@200>");
		expect(m.formatGameStatus(gameWithState(stateAwaitingMatch))).toContain("<@300>");
	});

	it("lists the current disqualified players when awaiting a match", () => {
		jest.spyOn(m, 'gameStateIsAwaitingMatch').mockReturnValue(true);
		const state = {
			...stateAwaitingMatch,
			disqualifiedFromRound: new Set([user4]),
		} as GameStateAwaitingMatch;
		expect(m.formatGameStatus(gameWithState(state))).toContain("<@400>");
	});

	it("lists the match authors when awaiting a new tag", () => {
		jest.spyOn(m, 'gameStateIsAwaitingNext').mockReturnValue(true);
		expect(m.formatGameStatus(gameWithState(stateAwaitingNext))).toContain("<@100>");
		expect(m.formatGameStatus(gameWithState(stateAwaitingNext))).toContain("<@200>");
		expect(m.formatGameStatus(gameWithState(stateAwaitingNext))).toContain("<@300>");
	});

	it("throws an error if it comes across an unexpected state", () => {
		expect(() => {
			m.formatGameStatus(gameWithState({ status: 'invalid' } as unknown as GameState));
		}).toThrowError();
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
		jest.spyOn(m, 'getStatusEmbedField').mockReturnValue({ inline: false, name: "mock-name", value: "mock-value" });
		mockGetScoresEmbedFields.mockReturnValue([]);
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
		expect(response).toHaveProperty('embeds.0.fields', expect.arrayContaining([{ inline: false, name: "mock-name", value: "mock-value" }]));
	});

	it("has embeds for the scores", () => {
		mockGetScoresEmbedFields.mockImplementation((game, type) => ([{ inline: false, name: 'n', value: 'v' }, { inline: false, name: 'n2', value: 'v2' }]));
		const game = gameWithState(stateAwaitingNext);
		const response = m.formatGameStatusMessage(game);
		expect(getScoresEmbedFields).toHaveBeenCalledTimes(1);
		expect(getScoresEmbedFields).toHaveBeenCalledWith(game, expect.anything());
		expect(response).toHaveProperty('embeds.0.fields', expect.arrayContaining(mockGetScoresEmbedFields.mock.results[0].value as Embed[]));
	});
});

describe("updateGameStatusMessage", () => {
	const game = gameWithState(stateAwaitingNext);

	beforeEach(() => {
		jest.spyOn(m, 'formatGameStatusMessage').mockReturnValue({ content: "mock-message" });
		jest.spyOn(statusMessage, 'edit').mockResolvedValue(statusMessage);
		jest.spyOn(console, 'error').mockImplementation();
	});

	it("edits the status message to the new message", async () => {
		await m.updateGameStatusMessage({ ...game, statusMessage });
		expect(statusMessage.edit).toHaveBeenCalledTimes(1);
		expect(statusMessage.edit).toHaveBeenCalledWith({ content: "mock-message" });
	});

	it("logs an error if the status message can't be updated", async () => {
		jest.spyOn(statusMessage, 'edit').mockRejectedValue(new Error());
		await m.updateGameStatusMessage({ ...game, statusMessage });
		expect(console.error).toHaveBeenCalledTimes(1);
	});
});

describe("updateGameState", () => {
	it("clears timers then sets new timers, in that order", async () => {
		const mockUpdateGameStatusMessage = jest.spyOn(m, 'updateGameStatusMessage').mockImplementation(async () => {});
		const calls: string[] = [];
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

	it("updates the status message by default", async () => {
		const mockUpdateGameStatusMessage = jest.spyOn(m, 'updateGameStatusMessage').mockImplementation(async () => {});
		mockClearTimers.mockImplementation(() => {});
		mockSetTimers.mockImplementation(() => {});
		const game = gameWithState(stateAwaitingNext);
		await m.updateGameState(game, stateAwaitingMatch);
		expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
		expect(mockUpdateGameStatusMessage).toHaveBeenCalledWith(game);
	});

	it("updates the status message if told to", async () => {
		const mockUpdateGameStatusMessage = jest.spyOn(m, 'updateGameStatusMessage').mockImplementation(async () => {});
		mockClearTimers.mockImplementation(() => {});
		mockSetTimers.mockImplementation(() => {});
		const game = gameWithState(stateAwaitingNext);
		await m.updateGameState(game, stateAwaitingMatch, true);
		expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
		expect(mockUpdateGameStatusMessage).toHaveBeenCalledWith(game);
	});

	it("does not update the status message if told not to", async () => {
		const mockUpdateGameStatusMessage = jest.spyOn(m, 'updateGameStatusMessage').mockImplementation(async () => {});
		mockClearTimers.mockImplementation(() => {});
		mockSetTimers.mockImplementation(() => {});
		const game = gameWithState(stateAwaitingNext);
		await m.updateGameState(game, stateAwaitingMatch, false);
		expect(mockUpdateGameStatusMessage).not.toHaveBeenCalled();
	});
});

describe("getDisqualifiedPlayersEmbedField", () => {
	describe("when the game state is free", () => {
		it("returns null", () => {
			const result = m.getDisqualifiedPlayersEmbedField(gameWithState(stateFree));
			expect(result).toBeNull();
		});
	});

	describe("when the game state is inactive", () => {
		it("returns null", () => {
			const result = m.getDisqualifiedPlayersEmbedField(gameWithState(stateInactive));
			expect(result).toBeNull();
		});
	});

	describe.each([
		["awaiting next", stateAwaitingNext],
		["awaiting match", stateAwaitingMatch],
	])("when the game state is %s", (_, state) => {
		it("returns an object with name and value", () => {
			const result = m.getDisqualifiedPlayersEmbedField(gameWithState({
				...state,
				disqualifiedFromRound: new Set([user1, user2]),
			} as typeof state));
			expect(result).toHaveProperty('name');
			expect(result).toHaveProperty('value');
		});

		it("lists each passed user", () => {
			mockToList.mockImplementation((strings: User[] | Set<User>) => [...strings].join(", "));
			const result = m.getDisqualifiedPlayersEmbedField(gameWithState({
				...state,
				disqualifiedFromRound: new Set([user1, user2]),
			} as typeof state));
			expect(result!.value).toEqual(expect.stringContaining("<@100>"));
			expect(result!.value).toEqual(expect.stringContaining("<@200>"));
		});

		it("says 'none' if there were no users", () => {
			const result = m.getDisqualifiedPlayersEmbedField(gameWithState({
				...state,
				disqualifiedFromRound: new Set(),
			} as typeof state));
			expect(result!.value).toEqual(expect.stringMatching(/none/i));
		});
	});
});

describe("start", () => {
	beforeEach(() => {
		jest.spyOn(m, 'gameStateIsInactive').mockReturnValue(true);
		jest.spyOn(m, 'updateGameState').mockResolvedValue();
		jest.spyOn(m, 'formatGameStatusMessage').mockReturnValue({});
		jest.spyOn(channel, 'send').mockResolvedValue(statusMessage);
		jest.spyOn(chatChannel, 'send').mockResolvedValue(chatMessage);
		jest.spyOn(statusMessage, 'pin').mockResolvedValue(statusMessage);
	});

	it("throws an error if the game is already running", async () => {
		jest.spyOn(m, 'gameStateIsInactive').mockReturnValue(false);
		const game = { channel, config: {} } as Game;
		await expect(async () => {
			await m.start(game);
		}).rejects.toThrowError();
		expect(m.updateGameState).not.toHaveBeenCalled();
		expect(channel.send).not.toHaveBeenCalled();
		expect(statusMessage.pin).not.toHaveBeenCalled();
		expect(chatChannel.send).not.toHaveBeenCalled();
		expect(mockPersist).not.toHaveBeenCalled();
	});

	it("updates the game state", async () => {
		const game = { channel, config: {} } as Game;
		await m.start(game);
		expect(m.updateGameState).toHaveBeenCalledTimes(1);
		expect(m.updateGameState).toHaveBeenCalledWith(game, expect.anything(), expect.anything());
	});

	it("updates the game state to free", async () => {
		const game = { channel, config: {} } as Game;
		await m.start(game);
		expect(m.updateGameState).toHaveBeenCalledTimes(1);
		expect(m.updateGameState).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'free' }), expect.anything());
	});

	it("does not use updateGameState's status message updating function", async () => {
		const game = { channel, config: {} } as Game;
		await m.start(game);
		expect(m.updateGameState).toHaveBeenCalledTimes(1);
		expect(m.updateGameState).toHaveBeenCalledWith(expect.anything(), expect.anything(), false);
	});

	it("posts a new status message", async () => {
		const game = { channel, config: {} } as Game;
		await m.start(game);
		expect(channel.send).toHaveBeenCalledTimes(1);
	});

	it("pins the new status message", async () => {
		const game = { channel, config: {} } as Game;
		await m.start(game);
		expect(statusMessage.pin).toHaveBeenCalledTimes(1);
	});

	it("makes an announcement in the chat channel if one is configured", async () => {
		const game = { channel, config: { chatChannel } } as Game;
		await m.start(game);
		expect(chatChannel.send).toHaveBeenCalledTimes(1);
	});

	it("does not make an announcement in the chat channel if none is configured", async () => {
		const game = { channel, config: {} } as Game;
		await m.start(game);
		expect(chatChannel.send).not.toHaveBeenCalled();
	});

	it("persists to disk on success", async () => {
		const game = { channel, config: {} } as Game;
		await m.start(game);
		expect(mockPersist).toHaveBeenCalledTimes(1);
	});
});

describe("finish", () => {
	beforeEach(() => {
		jest.spyOn(m, 'gameStateIsInactive').mockReturnValue(false);
		jest.spyOn(m, 'updateGameState').mockResolvedValue();
		jest.spyOn(m, 'start').mockResolvedValue();
		jest.spyOn(channel, 'send').mockResolvedValue(resultsMessage);
		jest.spyOn(chatChannel, 'send').mockResolvedValue(chatMessage);
		jest.spyOn(resultsMessage, 'pin').mockResolvedValue(resultsMessage);
		jest.spyOn(statusMessage, 'unpin').mockResolvedValue(statusMessage);
		jest.spyOn(statusMessage, 'edit').mockResolvedValue(statusMessage);
		mockGetScoresEmbedFields.mockReturnValue([]);
	});

	describe.each([
		["automatically called at end of period", true],
		["manually stopped", false],
	])("when %s", (_, endOfPeriod) => {
		it("throws an error if the game is not running", async () => {
			jest.spyOn(m, 'gameStateIsInactive').mockReturnValue(true);
			const game = { statusMessage } as Game;
			await expect(async () => {
				await m.finish(game, endOfPeriod);
			}).rejects.toThrowError();
			expect(m.updateGameState).not.toHaveBeenCalled();
			expect(m.start).not.toHaveBeenCalled();
			expect(channel.send).not.toHaveBeenCalled();
			expect(chatChannel.send).not.toHaveBeenCalled();
			expect(resultsMessage.pin).not.toHaveBeenCalled();
			expect(statusMessage.unpin).not.toHaveBeenCalled();
			expect(statusMessage.edit).not.toHaveBeenCalled();
		});

		it("posts a new results message in the game channel", async () => {
			const game = { channel, statusMessage, config: {} } as Game;
			await m.finish(game, endOfPeriod);
			expect(channel.send).toHaveBeenCalledTimes(1);
		});

		it("pins the new results message", async () => {
			const game = { channel, statusMessage, config: {} } as Game;
			await m.finish(game, endOfPeriod);
			expect(resultsMessage.pin).toHaveBeenCalledTimes(1);
		});

		it("edits the old status message", async () => {
			const game = { channel, statusMessage, config: {} } as Game;
			await m.finish(game, endOfPeriod);
			expect(statusMessage.edit).toHaveBeenCalledTimes(1);
		});

		it("unpins the old status message", async () => {
			const game = { channel, statusMessage, config: {} } as Game;
			await m.finish(game, endOfPeriod);
			expect(statusMessage.unpin).toHaveBeenCalledTimes(1);
		});

		it("makes an announcement in the chat channel if one is configured", async () => {
			const game = { channel, statusMessage, config: { chatChannel } } as Game;
			await m.finish(game, endOfPeriod);
			expect(chatChannel.send).toHaveBeenCalledTimes(1);
		});

		it("does not make an announcement in the chat channel if none is configured", async () => {
			const game = { channel, statusMessage, config: {} } as Game;
			await m.finish(game, endOfPeriod);
			expect(chatChannel.send).not.toHaveBeenCalled();
		});

		it("removes the reference to the old status message", async () => {
			const game = { channel, statusMessage, config: {} } as Game;
			expect(game.statusMessage).not.toBeNull();
			await m.finish(game, endOfPeriod);
			expect(game.statusMessage).toBeNull();
		});

		it("updates the game state", async () => {
			const game = { channel, statusMessage, config: {} } as Game;
			await m.finish(game, endOfPeriod);
			expect(m.updateGameState).toHaveBeenCalledTimes(1);
			expect(m.updateGameState).toHaveBeenCalledWith(game, expect.anything(), expect.anything());
		});

		it("updates the game state to inactive", async () => {
			const game = { channel, statusMessage, config: {} } as Game;
			await m.finish(game, endOfPeriod);
			expect(m.updateGameState).toHaveBeenCalledTimes(1);
			expect(m.updateGameState).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'inactive' }), expect.anything());
		});

		it("does not use updateGameState's status message updating function", async () => {
			const game = { channel, statusMessage, config: {} } as Game;
			await m.finish(game, endOfPeriod);
			expect(m.updateGameState).toHaveBeenCalledTimes(1);
			expect(m.updateGameState).toHaveBeenCalledWith(expect.anything(), expect.anything(), false);
		});
	});

	it.each([
		["the game is configured to be manual, and the game was manually stopped", null, false],
		["the game is configured to be periodic, and the game was automatically stopped", 'month', true],
		["the game is configured to be periodic, and the game was manually stopped", 'month', false],
	])("does not automatically restart and does save to disk when auto-restart is off, %s", async (_, period, endOfPeriod) => {
		const game = { channel, statusMessage, config: { period, autoRestart: false } } as Game;
		await m.finish(game, endOfPeriod);
		expect(m.start).not.toHaveBeenCalled();
		expect(mockPersist).toHaveBeenCalledTimes(1);
	});

	it.each([
		["the game is configured to be manual, and the game was manually stopped", null, false],
		["the game is configured to be periodic, and the game was manually stopped", 'month', false],
	])("does not automatically restart and does save to disk when auto-restart is on, %s", async (_, period, endOfPeriod) => {
		const game = { channel, statusMessage, config: { period, autoRestart: true } } as Game;
		await m.finish(game, endOfPeriod);
		expect(m.start).not.toHaveBeenCalled();
		expect(mockPersist).toHaveBeenCalledTimes(1);
	});

	it.each([
		["the game is configured to be periodic, and the game was automatically stopped", 'month', true],
	])("automatically restarts and does not save to disk when auto-restart is on, %s", async (_, period, endOfPeriod) => {
		const game = { channel, statusMessage, config: { period, autoRestart: true } } as Game;
		await m.finish(game, endOfPeriod);
		expect(m.start).toHaveBeenCalledTimes(1);
		expect(m.start).toHaveBeenCalledWith(game);
		expect(mockPersist).not.toHaveBeenCalled();
	});
});
