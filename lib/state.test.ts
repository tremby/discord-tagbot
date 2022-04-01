import state, * as m from './state';
import { getClient, getGuild, getTextChannel, getUser, getRole, getMessage } from '../test/fixtures';

import { mocked } from 'jest-mock';

jest.mock('./config');
import { serializeConfig } from './config';
const mockSerializeConfig = mocked(serializeConfig);

jest.mock('fs/promises');
import { writeFile, readFile } from 'fs/promises';
const mockWriteFile = mocked(writeFile);
const mockReadFile = mocked(readFile);

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

describe("persistToDisk", () => {
	beforeEach(() => {
		state.games = new Set([game1, game2]);
		state.deletedMessageIds = new Set();
	});

	afterAll(() => {
		state.games = new Set();
		state.deletedMessageIds = new Set();
	});

	it("writes the result of serializeGame for each game to disk", async () => {
		jest.spyOn(m, 'serializeGame').mockImplementation((game) => `game ${game.state.status}` as unknown as SerializedGame);
		await m.persistToDisk();
		expect(mockWriteFile).toHaveBeenCalledTimes(1);
		expect(mockWriteFile).toHaveBeenCalledWith(expect.anything(), expect.any(String));
		const serialized = mockWriteFile.mock.calls[0][1] as string;
		const obj = JSON.parse(serialized);
		expect(obj).toHaveProperty('games', expect.arrayContaining(['game awaiting-next', 'game awaiting-match']));
		expect(obj.games).toHaveLength(2);
	});
});

describe("loadFromDisk", () => {
	const client = getClient();

	beforeEach(() => {
		state.games = new Set();
		state.deletedMessageIds = new Set();

		jest.spyOn(console, 'log').mockImplementation();
		jest.spyOn(client.channels, 'fetch').mockImplementation(async (id) => id === 'channel-1' ? channel1 : id === 'channel-2' ? channel2 : channel3);
		jest.spyOn(client.users, 'fetch').mockImplementation(async (id) => id === 'user-1' ? user1 : user2);
		// @ts-ignore: bug in types? this method is certainly allowed to return single roles
		jest.spyOn(guild.roles, 'fetch').mockImplementation(async (id) => id === 'role-1' ? role1 : role2);
		jest.spyOn(channel1.messages, 'fetch').mockResolvedValue(
			// @ts-expect-error: overloaded function; mocking it properly would be a pain
			statusMessage
		);
		jest.spyOn(channel2.messages, 'fetch').mockResolvedValue(
			// @ts-expect-error: overloaded function; mocking it properly would be a pain
			statusMessage
		);

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
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect(state.games.size).toBe(2);
	});

	it("restores channels", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect(client.channels.fetch).toHaveBeenCalledWith('channel-1');
		expect([...state.games][0]).toHaveProperty('channel', channel1);
	});

	it("restores players disqualified for the current round", async () => {
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect(client.users.fetch).toHaveBeenCalledWith('user-1');
		expect(client.users.fetch).toHaveBeenCalledWith('user-2');
		expect([...state.games][0]).toHaveProperty('state.disqualifiedFromRound.size', 2);
		expect(([...state.games][0].state as GameStateAwaitingNext).disqualifiedFromRound.has(user1)).toBe(true);
		expect(([...state.games][0].state as GameStateAwaitingNext).disqualifiedFromRound.has(user2)).toBe(true);
	});

	it("restores lack of players disqualified for the current round", async () => {
		mockGameStateIsAwaitingMatch.mockReturnValue(true);
		mockGameStateIsAwaitingNext.mockReturnValue(false);
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect(client.users.fetch).not.toHaveBeenCalled();
		expect([...state.games][0]).toHaveProperty('state.disqualifiedFromRound.size', 0);
	});

	it("restores time limit", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect([...state.games][0]).toHaveProperty('config.nextTagTimeLimit', 3600e3);
	});

	it("restores a lack of time limit", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect([...state.games][0]).toHaveProperty('config.nextTagTimeLimit', null);
	});

	it("restores judge roles", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect(guild.roles.fetch).toHaveBeenCalledWith('role-1');
		expect(guild.roles.fetch).toHaveBeenCalledWith('role-2');
		expect([...state.games][0].config.tagJudgeRoles.has(role1)).toBe(true);
		expect([...state.games][0].config.tagJudgeRoles.has(role2)).toBe(true);
		expect([...state.games][0].config.tagJudgeRoles.size).toBe(2);
	});

	it("restores a lack of judge roles", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect([...state.games][0].config.tagJudgeRoles.size).toBe(0);
	});

	it("restores chat channel", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect(client.channels.fetch).toHaveBeenCalledWith('channel-3');
		expect([...state.games][0].config.chatChannel).toBe(channel3);
	});

	it("restores lack of chat channel", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect([...state.games][0]).toHaveProperty('config.chatChannel', null);
	});

	it("doesn't cause a recount if the status was inactive", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
		await m.loadFromDisk(client);
		expect(mockRecount).not.toHaveBeenCalled();
	});

	it("causes a recount for active statuses", async () => {
		for (const st of ['free', 'awaiting-next', 'awaiting-match']) {
			mockReadFile.mockResolvedValue(JSON.stringify({
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
					},
				],
			}));
			await m.loadFromDisk(client);
		}
		expect(mockRecount).toHaveBeenCalledTimes(3);
	});

	it("correctly sets the status for inactive games", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
		await m.loadFromDisk(client);
		expect([...state.games][0]).toHaveProperty('state', { status: 'inactive' });
	});

	it("uses the recount's conclusion as state for active games", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
		await m.loadFromDisk(client);
		expect([...state.games][0]).toHaveProperty('state', stateAwaitingNext);
	});

	it("attempts to find the pinned status message", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
		await m.loadFromDisk(client);
		expect(channel1.messages.fetch).toHaveBeenCalledTimes(1);
		expect(channel1.messages.fetch).toHaveBeenCalledWith('abc');
		expect([...state.games][0]).toHaveProperty('statusMessage', statusMessage);
	});

	it("starts timers if appropriate", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect(mockSetTimers).toHaveBeenCalledTimes(1);
	});

	it("updates the game status message if the game state was awaiting-next", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
	});

	it("updates the game status message if the game state was awaiting-match", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
	});

	it("updates the game status message if the game state was free", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
				},
			],
		}));
		await m.loadFromDisk(client);
		expect(mockUpdateGameStatusMessage).toHaveBeenCalledTimes(1);
	});

	it("does not update the game status message if the game state was inactive", async () => {
		mockReadFile.mockResolvedValue(JSON.stringify({
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
		await m.loadFromDisk(client);
		expect(mockUpdateGameStatusMessage).not.toHaveBeenCalled();
	});
});
