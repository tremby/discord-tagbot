import * as m from './channel';
import { ClientUser, Collection } from 'discord.js';
import type { MessageManager } from 'discord.js';
import { getBotUser, getGuild, getTextChannel, getUser, getMessage } from '../test/fixtures';

const guild = getGuild();
const channel1 = getTextChannel(guild);
const channel2 = getTextChannel(guild);
const channel3 = getTextChannel(guild);
const user1 = getUser('user-1');
const user2 = getUser('user-2');
const botUser = getBotUser();

import appState from '../lib/state';

describe("channelIsTextChannel", () => {
	it("expects certain properties", () => {
		expect(m.channelIsTextChannel({})).toBe(false);
	});

	it("expects type to be `GUILD_TEXT`", () => {
		expect(m.channelIsTextChannel({ type: 'foo' })).toBe(false);
		expect(m.channelIsTextChannel({ type: 'GUILD_TEXT' })).toBe(true);
	});
});

describe("getGameOfChannel", () => {
	const game1 = {
		channel: channel1,
		config: {
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
		},
		state: {
			status: 'free',
			scores: new Map(),
		} as GameStateFree,
		statusMessage: null,
	} as Game;
	const game2 = {
		channel: channel2,
		config: {
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
		},
		state: {
			status: 'archived',
			scores: new Map(),
		} as GameStateArchived,
		statusMessage: null,
	} as Game;

	beforeEach(() => {
		appState.games = new Set([
			game1,
			game2,
		]);
	});

	afterAll(() => {
		appState.games = new Set();
	});

	it("returns null if there are no games", () => {
		appState.games = new Set();
		expect(m.getGameOfChannel(channel1)).toBeNull();
	});

	it("returns null if there are no matches", () => {
		expect(m.getGameOfChannel(channel3)).toBeNull();
	});

	it("returns the match", () => {
		expect(m.getGameOfChannel(channel1)).toBe(game1);
		expect(m.getGameOfChannel(channel2)).toBe(game2);
	});
});

describe("getAllMessages", () => {
	beforeAll(() => {
		jest.spyOn(console, 'log').mockImplementation();
	});

	async function flushIterator(it) {
		const results = [];
		for await (const x of it) results.push(x);
		return results;
	}

	it("passes the force value through to the fetcher", async () => {
		const mockFetch = jest.spyOn(channel1.messages, 'fetch').mockResolvedValue(new Collection([]));
		let results = await flushIterator(m.getAllMessages(channel1, false));
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ force: false }));
		mockFetch.mockClear();
		results = await flushIterator(m.getAllMessages(channel1, true));
		await m.getAllMessages(channel1, true);
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ force: true }));
	});

	it("reverses each page of results into chronological order", async () => {
		const page1 = [];
		for (let i = 1; i <= 100; i++) {
			page1.push([i.toString(), getMessage(channel1, user1, [], false, false, new Date("2020Z"), `page 1 message ${i}`)]);
		}
		const page2 = [];
		for (let i = 1; i <= 100; i++) {
			page2.push([i.toString(), getMessage(channel1, user1, [], false, false, new Date("2020Z"), `page 2 message ${i}`)]);
		}
		const mockFetch = jest.spyOn(channel1.messages, 'fetch')
			.mockResolvedValueOnce(new Collection(page1))
			.mockResolvedValueOnce(new Collection(page2))
			.mockResolvedValue(new Collection([]));
		const results = await flushIterator(m.getAllMessages(channel1, false));
		expect(results[0].content).toBe("page 1 message 100");
		expect(results[1].content).toBe("page 1 message 99");
		expect(results[99].content).toBe("page 1 message 1");
		expect(results[100].content).toBe("page 2 message 100");
		expect(results[101].content).toBe("page 2 message 99");
		expect(results[199].content).toBe("page 2 message 1");
	});

	it("keeps fetching until a page has fewer than the maximum number of results", async () => {
		const page1 = [];
		for (let i = 1; i <= 100; i++) {
			page1.push([i.toString(), getMessage(channel1, user1, [], false, false, new Date("2020Z"), `page 1 message ${i}`)]);
		}
		const page2 = [];
		for (let i = 1; i <= 100; i++) {
			page2.push([i.toString(), getMessage(channel1, user1, [], false, false, new Date("2020Z"), `page 2 message ${i}`)]);
		}
		const page3 = [];
		for (let i = 1; i <= 30; i++) {
			page3.push([i.toString(), getMessage(channel1, user1, [], false, false, new Date("2020Z"), `page 3 message ${i}`)]);
		}
		const mockFetch = jest.spyOn(channel1.messages, 'fetch')
			.mockResolvedValueOnce(new Collection(page1))
			.mockResolvedValueOnce(new Collection(page2))
			.mockResolvedValueOnce(new Collection(page3))
			.mockResolvedValue(new Collection([]));
		const results = await flushIterator(m.getAllMessages(channel1, false));
		expect(mockFetch).toHaveBeenCalledTimes(3);
		expect(results).toHaveLength(230);
	});
});

describe("getStatusMessage", () => {
	it("searches the pinned messages", async () => {
		const spiedFetchPinned = jest.spyOn(channel1.messages, 'fetchPinned').mockResolvedValue(new Collection([
			['a', getMessage(channel1, user1, [], false, true, new Date("2020Z"), "from user1")],
			['b', getMessage(channel1, user2, [], false, true, new Date("2020Z"), "from user2")],
			['c', getMessage(channel1, botUser, [], false, true, new Date("2020Z"), "from bot user")],
		]));
		await m.getStatusMessage(channel1);
		expect(spiedFetchPinned).toHaveBeenCalledTimes(1);
	});

	it("rejects messages not marked as pinned", async () => {
		const spiedFetchPinned = jest.spyOn(channel1.messages, 'fetchPinned').mockResolvedValue(new Collection([
			['a', getMessage(channel1, user1, [], false, false, new Date("2020Z"), "from user1")],
			['b', getMessage(channel1, user2, [], false, false, new Date("2020Z"), "from user2")],
			['c', getMessage(channel1, botUser, [], false, false, new Date("2020Z"), "from bot user")],
		]));
		expect(await m.getStatusMessage(channel1)).toBeNull();
	});

	it("rejects messages not posted by the bot user", async () => {
		const spiedFetchPinned = jest.spyOn(channel1.messages, 'fetchPinned').mockResolvedValue(new Collection([
			['a', getMessage(channel1, user1, [], false, true, new Date("2020Z"), "from user1")],
			['b', getMessage(channel1, user2, [], false, true, new Date("2020Z"), "from user2")],
			['c', getMessage(channel1, user1, [], false, true, new Date("2020Z"), "from user1 again")],
		]));
		expect(await m.getStatusMessage(channel1)).toBeNull();
	});

	it("returns a message matching the criteria", async () => {
		const botMessage = getMessage(channel1, botUser, [], false, true, new Date("2020Z"), "from bot user");
		const spiedFetchPinned = jest.spyOn(channel1.messages, 'fetchPinned').mockResolvedValue(new Collection([
			['a', getMessage(channel1, user1, [], false, true, new Date("2020Z"), "from user1")],
			['b', getMessage(channel1, user2, [], false, true, new Date("2020Z"), "from user2")],
			['c', botMessage],
		]));
		const match = await m.getStatusMessage(channel1);
		expect(match).toBe(botMessage);
	});
});
