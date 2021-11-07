import * as m from './timers';
import { getBotUser, getGuild, getTextChannel, getUser, getMessage } from '../test/fixtures';
import { expectAnyOf, flushPromises } from '../test/util';

import { mocked } from 'ts-jest/utils';

jest.mock('./game-state');
import { gameStateIsAwaitingNext, gameStateIsAwaitingMatch, updateGameState } from './game-state';
const mockGameStateIsAwaitingNext = mocked(gameStateIsAwaitingNext);
const mockGameStateIsAwaitingMatch = mocked(gameStateIsAwaitingMatch);
const mockUpdateGameState = mocked(updateGameState);

jest.mock('./deadline');
import { getDeadlineTimestamp, getFormattedDeadline } from './deadline';
const mockGetDeadlineTimestamp = mocked(getDeadlineTimestamp);
const mockGetFormattedDeadline = mocked(getFormattedDeadline);

jest.mock('./message');
import { getMessageUsers, deleteMessage } from './message';
const mockGetMessageUsers = mocked(getMessageUsers);
const mockDeleteMessage = mocked(deleteMessage);

jest.mock('./string');
import { pluralize, toList } from './string';
const mockPluralize = mocked(pluralize);
const mockToList = mocked(toList);

jest.mock('./scoring');
import { recount } from './scoring';
const mockRecount = mocked(recount);

const guild = getGuild();
const gameChannel = getTextChannel(guild);
const chatChannel = getTextChannel(guild);
const user1 = getUser('user-1');
const user2 = getUser('user-2');
const user3 = getUser('user-3');
const matchMessage = getMessage(gameChannel, user1, [user2, user3], true, false, new Date('2020-01-01T00:00Z'), "tag match");
const tagMessage = getMessage(gameChannel, user1, [user2, user3], true, false, new Date('2020-01-01T00:00Z'), "tag");
const statusMessage = getMessage(gameChannel, getBotUser(), [], false, true, new Date('2020Z'), "status");

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
	excludedFromRound: new Set(),
};
const stateAwaitingMatch: GameStateAwaitingMatch = {
	status: 'awaiting-match',
	scores: new Map(),
	tag: tagMessage,
	excludedFromRound: new Set(),
};
const stateArchived: GameStateArchived = {
	status: 'archived',
	scores: null,
};

const game: Game = {
	channel: gameChannel,
	config: {
		nextTagTimeLimit: 3600e3,
		tagJudgeRoles: new Set(),
		chatChannel,
	},
	statusMessage: null,
	state: stateAwaitingNext,
};

describe("setTimers", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mockRecount.mockResolvedValue(stateAwaitingMatch);
	});
	afterEach(() => {
		// FIXME: I don't see why this should be necessary,
		// but tests seem to fail (setTimeout returns undefined) without this,
		// for the second test and beyond.
		jest.useRealTimers();
	});

	describe("reminder timer", () => {
		it("does nothing if the game state is not awaiting next", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			const state = { ...stateFree };
			m.setTimers(game, state);
			expectAnyOf(
				() => expect(state).not.toHaveProperty('reminderTimer'),
				() => expect(state).toHaveProperty('reminderTimer', null),
			);
			expect(mockSetTimeout).not.toHaveBeenCalledWith(expect.toBeFunctionWithName('reminderHandler'), expect.anything());
			jest.runAllTimers();
			await flushPromises();
			expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
			expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
		});

		it("does nothing if there is no time limit", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			const state = { ...stateAwaitingNext };
			m.setTimers({
				...game,
				config: {
					...game.config,
					nextTagTimeLimit: null,
				},
			}, state);
			expectAnyOf(
				() => expect(state).not.toHaveProperty('reminderTimer'),
				() => expect(state).toHaveProperty('reminderTimer', null),
			);
			expect(mockSetTimeout).not.toHaveBeenCalledWith(expect.toBeFunctionWithName('reminderHandler'), expect.anything());
			jest.runAllTimers();
			await flushPromises();
			expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
			expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
		});

		it("does nothing if the deadline is in the past", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T02:00Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() - 1e3 * 60 * 60);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			expectAnyOf(
				() => expect(state).not.toHaveProperty('reminderTimer'),
				() => expect(state).toHaveProperty('reminderTimer', null),
			);
			expect(mockSetTimeout).not.toHaveBeenCalledWith(expect.toBeFunctionWithName('reminderHandler'), expect.anything());
			jest.runAllTimers();
			await flushPromises();
			expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
			expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
		});

		it("does nothing if the time limit is too short", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:07Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60);
			const state = { ...stateAwaitingNext };
			m.setTimers({
				...game,
				config: {
					...game.config,
					nextTagTimeLimit: 1e3 * 60 * 8,
				},
			}, state);
			expectAnyOf(
				() => expect(state).not.toHaveProperty('reminderTimer'),
				() => expect(state).toHaveProperty('reminderTimer', null),
			);
			expect(mockSetTimeout).not.toHaveBeenCalledWith(expect.toBeFunctionWithName('reminderHandler'), expect.anything());
			jest.runAllTimers();
			await flushPromises();
			expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
			expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
		});

		it("does nothing if the reminder should already have happened", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:58Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 2);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			expectAnyOf(
				() => expect(state).not.toHaveProperty('reminderTimer'),
				() => expect(state).toHaveProperty('reminderTimer', null),
			);
			expect(mockSetTimeout).not.toHaveBeenCalledWith(expect.toBeFunctionWithName('reminderHandler'), expect.anything());
			jest.runAllTimers();
			await flushPromises();
			expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
			expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
		});

		it("sets a timer but, if it isn't cancelled, the timer will do nothing if the game state has moved on", async () => {
			const mockError = jest.spyOn(console, 'error').mockImplementation();
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			expect(mockSetTimeout).toHaveBeenCalledWith(expect.toBeFunctionWithName('reminderHandler'), expect.anything());
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			jest.runAllTimers();
			await flushPromises();
			expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
			expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
			expect(mockError).toHaveBeenCalledWith(expect.stringMatching(/was going to send a reminder/i));
		});

		it("sets a timer with the correct timeout", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			expect(mockSetTimeout).toHaveBeenCalledWith(expect.toBeFunctionWithName('reminderHandler'), 1e3 * 60 * 10);
			jest.runAllTimers();
			await flushPromises();
		});

		it("stores a reference to the timer", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			expect(state.reminderTimer).toBeFalsy();
			m.setTimers(game, state);
			expect(state).toHaveProperty('reminderTimer', expect.any(Object)),
			jest.runAllTimers();
			await flushPromises();
		});

		it("sends a message with a warning once the timer runs out", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			jest.runAllTimers();
			await flushPromises();
			expectAnyOf(
				() => expect(mockGameChannelSend).toHaveBeenCalledWith(expect.objectContaining({
					content: expect.stringContaining("time is running out"),
				})),
				() => expect(mockChatChannelSend).toHaveBeenCalledWith(expect.objectContaining({
					content: expect.stringContaining("time is running out"),
				})),
			);
		});

		it("sends the message to the chat channel if there is one", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			jest.runAllTimers();
			await flushPromises();
			expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
			expect(mockChatChannelSend).toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
		});

		it("sends the message to the game channel if there is no chat channel", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			m.setTimers({
				...game,
				config: {
					...game.config,
					chatChannel: null,
				},
			}, state);
			jest.runAllTimers();
			await flushPromises();
			expect(mockGameChannelSend).toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
			expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time is running out"),
			}));
		});
	});

	describe("time up timer", () => {
		it("does nothing if the game state is not awaiting next", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			const state = { ...stateFree };
			m.setTimers(game, state);
			expectAnyOf(
				() => expect(state).not.toHaveProperty('timeUpTimer'),
				() => expect(state).toHaveProperty('timeUpTimer', null),
			);
			expect(mockSetTimeout).not.toHaveBeenCalledWith(expect.toBeFunctionWithName('timeUpHandler'), expect.anything());
			jest.runAllTimers();
			await flushPromises();
			expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time has run out"),
			}));
			expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time has run out"),
			}));
			expect(mockDeleteMessage).not.toHaveBeenCalled();
		});

		it("does nothing if there is no time limit", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			const state = { ...stateAwaitingNext };
			m.setTimers({
				...game,
				config: {
					...game.config,
					nextTagTimeLimit: null,
				},
			}, state);
			expectAnyOf(
				() => expect(state).not.toHaveProperty('timeUpTimer'),
				() => expect(state).toHaveProperty('timeUpTimer', null),
			);
			expect(mockSetTimeout).not.toHaveBeenCalledWith(expect.toBeFunctionWithName('timeUpHandler'), expect.anything());
			jest.runAllTimers();
			await flushPromises();
			expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time has run out"),
			}));
			expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time has run out"),
			}));
			expect(mockDeleteMessage).not.toHaveBeenCalled();
		});

		it("does nothing if the deadline is in the past", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T02:00Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() - 1e3 * 60 * 60);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			expectAnyOf(
				() => expect(state).not.toHaveProperty('timeUpTimer'),
				() => expect(state).toHaveProperty('timeUpTimer', null),
			);
			expect(mockSetTimeout).not.toHaveBeenCalledWith(expect.toBeFunctionWithName('timeUpHandler'), expect.anything());
			jest.runAllTimers();
			await flushPromises();
			expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time has run out"),
			}));
			expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time has run out"),
			}));
			expect(mockDeleteMessage).not.toHaveBeenCalled();
		});

		it("sets a timer but, if it isn't cancelled, the timer will do nothing if the game state has moved on", async () => {
			const mockError = jest.spyOn(console, 'error').mockImplementation();
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			expect(mockSetTimeout).toHaveBeenCalledWith(expect.toBeFunctionWithName('timeUpHandler'), expect.anything());
			mockGameStateIsAwaitingNext.mockReturnValue(false);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			jest.runAllTimers();
			await flushPromises();
			expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time has run out"),
			}));
			expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time has run out"),
			}));
			expect(mockError).toHaveBeenCalledWith(expect.stringMatching(/was going to send a time up message/i));
			expect(mockDeleteMessage).not.toHaveBeenCalled();
		});

		it("sets a timer with the correct timeout", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			expect(mockSetTimeout).toHaveBeenCalledWith(expect.toBeFunctionWithName('timeUpHandler'), 1e3 * 60 * 20);
			jest.runAllTimers();
			await flushPromises();
		});

		it("stores a reference to the timer", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			expect(state.timeUpTimer).toBeFalsy();
			m.setTimers(game, state);
			expect(state).toHaveProperty('timeUpTimer', expect.any(Object)),
			jest.runAllTimers();
			await flushPromises();
		});

		it("deletes the match message once the timer runs out", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			jest.runAllTimers();
			await flushPromises();
			expect(mockDeleteMessage).toHaveBeenCalledTimes(1);
			expect(mockDeleteMessage).toHaveBeenCalledWith(matchMessage);
		});

		it("sends a message once the timer runs out", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			jest.runAllTimers();
			await flushPromises();
			await flushPromises(); // FIXME: no idea why I need to call this twice
			expectAnyOf(
				() => expect(mockGameChannelSend).toHaveBeenCalledWith(expect.objectContaining({
					content: expect.stringContaining("time has run out"),
				})),
				() => expect(mockChatChannelSend).toHaveBeenCalledWith(expect.objectContaining({
					content: expect.stringContaining("time has run out"),
				})),
			);
		});

		it("sends the message to the chat channel if there is one", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			jest.runAllTimers();
			await flushPromises();
			await flushPromises(); // FIXME: no idea why I need to call this twice
			expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time has run out"),
			}));
			expect(mockChatChannelSend).toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time has run out"),
			}));
		});

		it("sends the message to the game channel if there is no chat channel", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			m.setTimers({
				...game,
				config: {
					...game.config,
					chatChannel: null,
				},
			}, state);
			jest.runAllTimers();
			await flushPromises();
			await flushPromises(); // FIXME: no idea why I need to call this twice
			expect(mockGameChannelSend).toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time has run out"),
			}));
			expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
				content: expect.stringContaining("time has run out"),
			}));
		});

		it("includes the status message link if it is known", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			const tmpGame = { ...game, statusMessage };
			m.setTimers(tmpGame, state);
			jest.runAllTimers();
			await flushPromises();
			await flushPromises(); // FIXME: no idea why I need to call this twice
			expect(mockChatChannelSend).toHaveBeenCalledWith(expect.objectContaining({
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

		it("triggers a recount", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			jest.runAllTimers();
			await flushPromises();
			await flushPromises(); // FIXME: no idea why I need to call this twice
			expect(mockRecount).toHaveBeenCalledTimes(1);
			expect(mockRecount).toHaveBeenCalledWith(game);
		});

		it("updates the game state to the recount result", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const newState = { ...stateAwaitingMatch };
			mockRecount.mockResolvedValue(newState);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			jest.runAllTimers();
			await flushPromises();
			await flushPromises(); // FIXME: no idea why I need to call this twice
			expect(mockUpdateGameState).toHaveBeenCalledTimes(1);
			expect(mockUpdateGameState).toHaveBeenCalledWith(game, newState);
		});

		it("adds the match authors to the list of banned users for this round", async () => {
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(true);
			mockGetMessageUsers.mockReturnValue(new Set([user1]));
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const newState = { ...stateAwaitingMatch };
			mockRecount.mockResolvedValue(newState);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			jest.runAllTimers();
			await flushPromises();
			await flushPromises(); // FIXME: no idea why I need to call this twice
			expect(newState).toHaveProperty('excludedFromRound.size', 1);
		});

		it("emits an error if somehow after deleting the match the state didn't go back to awaiting match", async () => {
			const mockError = jest.spyOn(console, 'error').mockImplementation();
			const mockSetTimeout = jest.spyOn(global, 'setTimeout');
			jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
			const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
			const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
			mockGameStateIsAwaitingNext.mockReturnValue(true);
			mockGameStateIsAwaitingMatch.mockReturnValue(false);
			mockGetMessageUsers.mockReturnValue(new Set());
			mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
			const state = { ...stateAwaitingNext };
			m.setTimers(game, state);
			jest.runAllTimers();
			await flushPromises();
			await flushPromises(); // FIXME: no idea why I need to call this twice
			expect(mockError).toHaveBeenCalledWith(expect.stringMatching(/expected state to go back to awaiting match/i));
		});
	});
});

describe("clearTimers", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});
	afterEach(() => {
		// FIXME: I don't see why this should be necessary,
		// but tests seem to fail (setTimeout returns undefined) without this,
		// for the second test and beyond.
		jest.useRealTimers();
	});

	it("clears the reminder timer", async () => {
		const tmpGame = {
			...game,
			state: { ...stateAwaitingNext },
		};
		const mockSetTimeout = jest.spyOn(global, 'setTimeout');
		jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
		const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
		const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
		mockGameStateIsAwaitingNext.mockReturnValue(true);
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		mockGetMessageUsers.mockReturnValue(new Set());
		mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
		m.setTimers(tmpGame, tmpGame.state);
		expect(tmpGame.state).toHaveProperty('reminderTimer', expect.any(Object)),
		m.clearTimers(tmpGame);
		jest.runAllTimers();
		await flushPromises();
		expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
			content: expect.stringContaining("time is running out"),
		}));
		expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
			content: expect.stringContaining("time is running out"),
		}));
	});

	it("clears the reminder timer reference", async () => {
		const tmpGame = {
			...game,
			state: { ...stateAwaitingNext },
		};
		const mockSetTimeout = jest.spyOn(global, 'setTimeout');
		jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
		const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
		const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
		mockGameStateIsAwaitingNext.mockReturnValue(true);
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		mockGetMessageUsers.mockReturnValue(new Set());
		mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
		m.setTimers(tmpGame, tmpGame.state);
		expect(tmpGame.state).toHaveProperty('reminderTimer', expect.any(Object)),
		m.clearTimers(tmpGame);
		jest.runAllTimers();
		await flushPromises();
		expectAnyOf(
			() => expect(tmpGame.state).not.toHaveProperty('reminderTimer'),
			() => expect(tmpGame.state).toHaveProperty('reminderTimer', null),
		);
	});

	it("clears the time up timer", async () => {
		const tmpGame = {
			...game,
			state: { ...stateAwaitingNext },
		};
		const mockSetTimeout = jest.spyOn(global, 'setTimeout');
		jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
		const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
		const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
		mockGameStateIsAwaitingNext.mockReturnValue(true);
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		mockGetMessageUsers.mockReturnValue(new Set());
		mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
		m.setTimers(tmpGame, tmpGame.state);
		expect(tmpGame.state).toHaveProperty('timeUpTimer', expect.any(Object)),
		m.clearTimers(tmpGame);
		jest.runAllTimers();
		await flushPromises();
		expect(mockGameChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
			content: expect.stringContaining("time has run out"),
		}));
		expect(mockChatChannelSend).not.toHaveBeenCalledWith(expect.objectContaining({
			content: expect.stringContaining("time has run out"),
		}));
	});

	it("clears the time up timer reference", async () => {
		const tmpGame = {
			...game,
			state: { ...stateAwaitingNext },
		};
		const mockSetTimeout = jest.spyOn(global, 'setTimeout');
		jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
		const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
		const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
		mockGameStateIsAwaitingNext.mockReturnValue(true);
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		mockGetMessageUsers.mockReturnValue(new Set());
		mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
		m.setTimers(tmpGame, tmpGame.state);
		expect(tmpGame.state).toHaveProperty('timeUpTimer', expect.any(Object)),
		m.clearTimers(tmpGame);
		jest.runAllTimers();
		await flushPromises();
		expectAnyOf(
			() => expect(tmpGame.state).not.toHaveProperty('timeUpTimer'),
			() => expect(tmpGame.state).toHaveProperty('timeUpTimer', null),
		);
	});

	it("does nothing if the game state has moved on", async () => {
		const tmpGame = {
			...game,
			state: { ...stateAwaitingNext },
		};
		const mockError = jest.spyOn(console, 'error').mockImplementation();
		const mockSetTimeout = jest.spyOn(global, 'setTimeout');
		const mockClearTimeout = jest.spyOn(global, 'clearTimeout');
		jest.setSystemTime(new Date('2020-01-01T00:40Z').getTime());
		const mockGameChannelSend = jest.spyOn(gameChannel, 'send').mockResolvedValue(null);
		const mockChatChannelSend = jest.spyOn(chatChannel, 'send').mockResolvedValue(null);
		mockGameStateIsAwaitingNext.mockReturnValue(true);
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		mockGetMessageUsers.mockReturnValue(new Set());
		mockGetDeadlineTimestamp.mockReturnValue(Date.now() + 1e3 * 60 * 20);
		m.setTimers(tmpGame, tmpGame.state);
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		m.clearTimers(tmpGame);
		jest.runAllTimers();
		await flushPromises();
		expect(mockClearTimeout).not.toHaveBeenCalled();
	});
});
