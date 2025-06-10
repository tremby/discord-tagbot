import type { RedisClientType } from 'redis';

import state, * as m from './state';
import { getClient, getGuild, getTextChannel, getUser, getRole, getMessage } from '../test/fixtures';

import { mocked } from 'jest-mock';

jest.mock('./config');
import { serializeConfig } from './config';
const mockSerializeConfig = mocked(serializeConfig);

jest.mock('./scoring');
import { recount } from './scoring';
const mockRecount = mocked(recount);

jest.mock('./timers');
import { setTimers } from './timers';
const mockSetTimers = mocked(setTimers);

jest.mock('./game-state');
import { gameStateIsAwaitingNext, gameStateIsAwaitingMatch, updateGameStatusMessage } from './game-state';
const mockGameStateIsAwaitingNext = mocked(gameStateIsAwaitingNext);
const mockGameStateIsAwaitingMatch = mocked(gameStateIsAwaitingMatch);
const mockUpdateGameStatusMessage = mocked(updateGameStatusMessage);

const mockRedisClient = {
	set: jest.fn(),
	get: jest.fn(),
};

const guild = getGuild();
const channel1 = getTextChannel(guild);
const channel2 = getTextChannel(guild);
const channel3 = getTextChannel(guild);
const role1 = getRole(guild, 'role-1');
const role2 = getRole(guild, 'role-2');
const botUser = getUser('bot-user');
const statusMessage = getMessage(channel1, botUser, [], false, true, new Date('2020Z'), "status");
const user1 = getUser('user-1');
const user2 = getUser('user-2');

const game1: Game = {
	channel: channel1,
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
	state: {
		status: 'awaiting-next',
		scores: new Map(),
		match: getMessage(channel1, user1, [user2], true, false, new Date('2020Z'), "tag match"),
		reminderTimer: null,
		timeUpTimer: null,
		disqualifiedFromRound: new Set([user1, user2]),
	} as GameStateAwaitingNext,
};
const game2: Game = {
	channel: channel2,
	config: {
		nextTagTimeLimit: 3600e3,
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
		tag: getMessage(channel2, user1, [user2], true, false, new Date('2020Z'), "tag"),
		disqualifiedFromRound: new Set(),
	} as GameStateAwaitingMatch,
};
const game3: Game = {
	channel: channel1,
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
		status: 'inactive',
	} as GameStateInactive,
};

describe("serializeGame", () => {
	it("includes the channel ID", () => {
		mockGameStateIsAwaitingNext.mockReturnValue(true);
		mockGameStateIsAwaitingMatch.mockReturnValue(false);
		const serialized = m.serializeGame(game1);
		expect(serialized).toHaveProperty('channelId', channel1.id);
	});

	it("includes the status", () => {
		mockGameStateIsAwaitingNext.mockReturnValue(true);
		mockGameStateIsAwaitingMatch.mockReturnValue(false);
		const serialized = m.serializeGame(game1);
		expect(serialized).toHaveProperty('status', 'awaiting-next');
	});

	it("includes the disqualified users", () => {
		mockGameStateIsAwaitingNext.mockReturnValue(true);
		mockGameStateIsAwaitingMatch.mockReturnValue(false);
		const serialized = m.serializeGame(game1);
		expect(serialized).toHaveProperty('disqualifiedFromRound', ['user-1', 'user-2']);
	});

	it("handles game states with no disqualified users", () => {
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockGameStateIsAwaitingMatch.mockReturnValue(false);
		const serialized = m.serializeGame(game3);
		expect(serialized).not.toHaveProperty('disqualifiedFromRound');
	});

	it("includes the configuration", () => {
		mockGameStateIsAwaitingNext.mockReturnValue(true);
		mockGameStateIsAwaitingMatch.mockReturnValue(false);
		mockSerializeConfig.mockReturnValue({ foo: 'mocked-config' } as unknown as SerializedConfig);
		const serialized = m.serializeGame(game1);
		expect(mockSerializeConfig).toHaveBeenCalledWith(game1.config);
		expect(serialized).toHaveProperty('config', { foo: 'mocked-config' });
	});

	it("handles lack of status message", () => {
		mockGameStateIsAwaitingNext.mockReturnValue(true);
		mockGameStateIsAwaitingMatch.mockReturnValue(false);
		const serialized = m.serializeGame(game1);
		expect(serialized).toHaveProperty('statusMessageId', null);
	});

	it("includes the status message ID if known", () => {
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		const serialized = m.serializeGame(game2);
		expect(serialized).toHaveProperty('statusMessageId', game2.statusMessage!.id);
	});
});

describe("persist", () => {
	beforeEach(() => {
		state.games = new Set([game1, game2]);
		state.deletedMessageIds = new Set();
		jest.spyOn(m, 'getRedisClient').mockReturnValue(mockRedisClient as unknown as jest.Mocked<RedisClientType>);
	});

	afterAll(() => {
		state.games = new Set();
		state.deletedMessageIds = new Set();
	});

	it("writes the result of serializeGame for each game to disk", async () => {
		jest.spyOn(m, 'serializeGame').mockImplementation((game) => `game ${game.state.status}` as unknown as SerializedGame);
		await m.persist();
		expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
		expect(mockRedisClient.set).toHaveBeenCalledWith(expect.anything(), expect.any(String));
		const serialized = mockRedisClient.set.mock.calls[0][1] as string;
		const obj = JSON.parse(serialized);
		expect(obj).toHaveProperty('games', expect.arrayContaining(['game awaiting-next', 'game awaiting-match']));
		expect(obj.games).toHaveLength(2);
	});
});

describe("load", () => {
	const client = getClient();

	beforeEach(() => {
		state.games = new Set();
		state.deletedMessageIds = new Set();

		jest.spyOn(console, 'log').mockImplementation();
		jest.spyOn(console, 'warn').mockImplementation();
		jest.spyOn(console, 'error').mockImplementation();
		jest.spyOn(client.channels, 'fetch').mockImplementation(async (id) => {
			switch (id) {
				case 'null-channel': return null;
				case 'bad-channel': throw new Error();
				case 'channel-1': return channel1;
				case 'channel-2': return channel2;
				default: return channel3;
			}
		});
		// @ts-ignore: apparently it can never return null, different from other similar methods; let's force it
		jest.spyOn(client.users, 'fetch').mockImplementation(async (id) => {
			switch (id) {
				case 'null-user': return null;
				case 'bad-user': throw new Error();
				case 'user-1': return user1;
				default: return user2;
			}
		});
		// @ts-ignore: bug in types? this method is certainly allowed to return single roles
		jest.spyOn(guild.roles, 'fetch').mockImplementation(async (id: string) => {
			switch (id) {
				case 'null-role': return null;
				case 'bad-role': throw new Error();
				case 'role-1': return role1;
				default: return role2;
			}
		});
		// @ts-expect-error: overloaded function; mocking it properly would be a pain
		jest.spyOn(channel1.messages, 'fetch').mockImplementation(async (id: any) => {
			switch (id) {
				case 'null-message': return null;
				case 'bad-message': throw new Error();
				default: return statusMessage;
			}
		});
		// @ts-expect-error: overloaded function; mocking it properly would be a pain
		jest.spyOn(channel2.messages, 'fetch').mockImplementation(async (id: any) => {
			switch (id) {
				case 'null-message': return null;
				case 'bad-message': throw new Error();
				default: return statusMessage;
			}
		});
		jest.spyOn(m, 'getRedisClient').mockReturnValue(mockRedisClient as unknown as jest.Mocked<RedisClientType>);

		mockRecount.mockResolvedValue({
			status: 'awaiting-match',
			scores: new Map(),
			tag: getMessage(channel2, user1, [user2], true, false, new Date('2020Z'), "tag"),
			disqualifiedFromRound: new Set(),
		} as GameStateAwaitingMatch);
		mockUpdateGameStatusMessage.mockResolvedValue();
	});

	afterAll(() => {
		state.games = new Set();
		state.deletedMessageIds = new Set();
	});

	it("restores a game for each entry in the file", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
				{
					channelId: 'channel-2',
					status: 'awaiting-match',
					disqualifiedFromRound: [],
					config: {
						nextTagTimeLimit: 1800e3,
						tagJudgeRoleIds: [],
						chatChannelId: null,
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(state.games.size).toBe(2);
	});

	it("restores channels", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(client.channels.fetch).toHaveBeenCalledWith('channel-1');
		expect([...state.games][0]).toHaveProperty('channel', channel1);
	});

	it("restores players disqualified for the current round", async () => {
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(client.users.fetch).toHaveBeenCalledWith('user-1');
		expect(client.users.fetch).toHaveBeenCalledWith('user-2');
		expect([...state.games][0]).toHaveProperty('state.disqualifiedFromRound.size', 2);
		expect(([...state.games][0].state as GameStateAwaitingNext).disqualifiedFromRound.has(user1)).toBe(true);
		expect(([...state.games][0].state as GameStateAwaitingNext).disqualifiedFromRound.has(user2)).toBe(true);
	});

	it("restores lack of players disqualified for the current round", async () => {
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: [],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(client.users.fetch).not.toHaveBeenCalled();
		expect([...state.games][0]).toHaveProperty('state.disqualifiedFromRound.size', 0);
	});

	it("restores time limit", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect([...state.games][0]).toHaveProperty('config.nextTagTimeLimit', 3600e3);
	});

	it("restores a lack of time limit", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect([...state.games][0]).toHaveProperty('config.nextTagTimeLimit', null);
	});

	it("restores judge roles", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(guild.roles.fetch).toHaveBeenCalledWith('role-1');
		expect(guild.roles.fetch).toHaveBeenCalledWith('role-2');
		expect([...state.games][0].config.tagJudgeRoles.has(role1)).toBe(true);
		expect([...state.games][0].config.tagJudgeRoles.has(role2)).toBe(true);
		expect([...state.games][0].config.tagJudgeRoles.size).toBe(2);
	});

	it("restores a lack of judge roles", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect([...state.games][0].config.tagJudgeRoles.size).toBe(0);
	});

	it("restores chat channel", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(client.channels.fetch).toHaveBeenCalledWith('channel-3');
		expect([...state.games][0].config.chatChannel).toBe(channel3);
	});

	it("restores lack of chat channel", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: null,
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect([...state.games][0]).toHaveProperty('config.chatChannel', null);
	});

	it("restores ranking strategy", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: 'channel-3',
						rankingStrategy: 'modifiedCompetition',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect([...state.games][0].config.rankingStrategy).toBe('modifiedCompetition');
	});

	it("sets a default ranking strategy if none was saved (from old version)", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect([...state.games][0].config.rankingStrategy).not.toBeNull();
	});

	it("doesn't cause a recount if the status was inactive", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'inactive',
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: null,
					},
				},
			],
		}));
		await m.load(client);
		expect(mockRecount).not.toHaveBeenCalled();
	});

	it("causes a recount for active statuses", async () => {
		for (const st of ['free', 'awaiting-next', 'awaiting-match']) {
			mockRedisClient.get.mockResolvedValue(JSON.stringify({
				games: [
					{
						channelId: 'channel-1',
						status: st,
						disqualifiedFromRound: [],
						config: {
							nextTagTimeLimit: null,
							tagJudgeRoleIds: [],
							chatChannelId: null,
						},
						statusMessageId: 'abc',
					},
				],
			}));
			await m.load(client);
		}
		expect(mockRecount).toHaveBeenCalledTimes(3);
	});

	it("correctly sets the status for inactive games", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'inactive',
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: null,
					},
				},
			],
		}));
		await m.load(client);
		expect([...state.games][0]).toHaveProperty('state', { status: 'inactive' });
	});

	it("uses the recount's conclusion as state for active games", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: [],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: null,
					},
					statusMessageId: 'abc',
				},
			],
		}));
		const stateAwaitingNext = {
			status: 'awaiting-next',
			scores: new Map(),
			match: getMessage(channel1, getUser('user-1'), [getUser('user-2')], true, false, new Date('2020Z'), "tag match"),
			reminderTimer: null,
			timeUpTimer: null,
		} as GameStateAwaitingNext;
		mockRecount.mockResolvedValue(stateAwaitingNext);
		await m.load(client);
		expect([...state.games][0]).toHaveProperty('state', stateAwaitingNext);
	});

	it("attempts to find the pinned status message", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: [],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: null,
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(channel1.messages.fetch).toHaveBeenCalledTimes(1);
		expect(channel1.messages.fetch).toHaveBeenCalledWith('abc');
		expect([...state.games][0]).toHaveProperty('statusMessage', statusMessage);
	});

	it("starts timers if appropriate", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: [],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: null,
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(mockSetTimers).toHaveBeenCalledTimes(1);
	});

	it("updates the game status message if the game state was awaiting-next", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: [],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: null,
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
	});

	it("updates the game status message if the game state was awaiting-match", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-match',
					disqualifiedFromRound: [],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: null,
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
	});

	it("updates the game status message if the game state was free", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'free',
					disqualifiedFromRound: [],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: null,
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
	});

	it("does not update the game status message if the game state was inactive", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'inactive',
					disqualifiedFromRound: [],
					config: {
						nextTagTimeLimit: null,
						tagJudgeRoleIds: [],
						chatChannelId: null,
					},
				},
			],
		}));
		await m.load(client);
		expect(mockUpdateGameStatusMessage).not.toHaveBeenCalled();
	});

	it("drops a game and logs an error if the game channel cannot be loaded (null returned)", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'null-channel',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(state.games.size).toBe(1);
		expect(console.error).toHaveBeenCalledTimes(1);
	});

	it("drops a game and logs an error if the game channel cannot be loaded (error thrown)", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'bad-channel',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(state.games.size).toBe(1);
		expect(console.error).toHaveBeenCalledTimes(1);
	});

	it("drops a tag judge role and logs a warning if the role cannot be loaded (null returned)", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['null-role', 'role-1'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(state.games.size).toBe(1);
		expect([...state.games][0].config.tagJudgeRoles.size).toBe(1);
		expect(console.warn).toHaveBeenCalledTimes(1);
	});

	it("drops a tag judge role and logs a warning if the role cannot be loaded (error thrown)", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['bad-role', 'role-1'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(state.games.size).toBe(1);
		expect([...state.games][0].config.tagJudgeRoles.size).toBe(1);
		expect(console.warn).toHaveBeenCalledTimes(1);
	});

	it("drops a chat channel and logs a warning if the chat channel cannot be loaded (null returned)", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'null-channel',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(state.games.size).toBe(1);
		expect([...state.games][0].config.chatChannel).toBeNull();
		expect(console.warn).toHaveBeenCalledTimes(1);
	});

	it("drops a chat channel and logs a warning if the chat channel cannot be loaded (error thrown)", async () => {
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['user-1', 'user-2'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'bad-channel',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect(state.games.size).toBe(1);
		expect([...state.games][0].config.chatChannel).toBeNull();
		expect(console.warn).toHaveBeenCalledTimes(1);
	});

	it("drops a disqualified player and logs a warning if the user cannot be loaded (null returned)", async () => {
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['null-user', 'user-1'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect([...state.games][0]).toHaveProperty('state.disqualifiedFromRound.size', 1);
		expect(console.warn).toHaveBeenCalledTimes(1);
	});

	it("drops a disqualified player and logs a warning if the user cannot be loaded (error thrown)", async () => {
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockRedisClient.get.mockResolvedValue(JSON.stringify({
			games: [
				{
					channelId: 'channel-1',
					status: 'awaiting-next',
					disqualifiedFromRound: ['bad-user', 'user-1'],
					config: {
						nextTagTimeLimit: 3600e3,
						tagJudgeRoleIds: ['role-1', 'role-2'],
						chatChannelId: 'channel-3',
					},
					statusMessageId: 'abc',
				},
			],
		}));
		await m.load(client);
		expect([...state.games][0]).toHaveProperty('state.disqualifiedFromRound.size', 1);
		expect(console.warn).toHaveBeenCalledTimes(1);
	});
});
