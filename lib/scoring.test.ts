import * as m from './scoring';
import { getBotUser, getGuild, getTextChannel, getUser, getMessage } from '../test/fixtures';
import type { Message, User } from 'discord.js';

import { mocked } from 'jest-mock';

jest.mock('./channel', () => ({
	getAllMessagesSince: jest.fn(),
}));
import { getAllMessagesSince } from './channel';
const mockGetAllMessagesSince = mocked(getAllMessagesSince);

jest.mock('./message');
import { messageHasImage, getMessageUsers, deleteMessage, getMessageImages } from './message';
const mockMessageHasImage = mocked(messageHasImage);
const mockGetMessageUsers = mocked(getMessageUsers);
const mockDeleteMessage = mocked(deleteMessage);
const mockGetMessageImages = mocked(getMessageImages);

jest.mock('./string');
import { toList } from './string';
const mockToList = mocked(toList);

const guild = getGuild();
const channel = getTextChannel(guild);
const chatChannel = getTextChannel(guild);
const user1 = getUser('100');
const user2 = getUser('200');
const user3 = getUser('300');
const user4 = getUser('400');
const botUser = getBotUser();
const tagByUser1 = getMessage(channel, user1, [], true, false, new Date('2020Z'), "tag by user 1");
const tagByUser2 = getMessage(channel, user2, [], true, false, new Date('2020Z'), "tag by user 2");
const tagByUser3 = getMessage(channel, user3, [], true, false, new Date('2020Z'), "tag by user 3");
const tagByUser4 = getMessage(channel, user4, [], true, false, new Date('2020Z'), "tag by user 4");
const tagByUser1FtUser2 = getMessage(channel, user1, [user2], true, false, new Date('2020Z'), "tag by user 1 ft user 2");
const tagByUser1FtUser3 = getMessage(channel, user1, [user3], true, false, new Date('2020Z'), "tag by user 1 ft user 3");
const tagByUser2FtUser1 = getMessage(channel, user2, [user1], true, false, new Date('2020Z'), "tag by user 2 ft user 1");
const tagByUser2FtUser3 = getMessage(channel, user2, [user3], true, false, new Date('2020Z'), "tag by user 2 ft user 3");
const tagByUser3FtUser1 = getMessage(channel, user3, [user1], true, false, new Date('2020Z'), "tag by user 3 ft user 1");
const tagByUser3FtUser2 = getMessage(channel, user3, [user2], true, false, new Date('2020Z'), "tag by user 3 ft user 2");
const lateTagByUser1 = getMessage(channel, user1, [], true, false, new Date('2021Z'), "latetag by user 1");
const matchByUser1 = getMessage(channel, user1, [], true, false, new Date('2020Z'), "match by user 1");
const matchByUser2 = getMessage(channel, user2, [], true, false, new Date('2020Z'), "match by user 2");
const matchByUser3 = getMessage(channel, user3, [], true, false, new Date('2020Z'), "match by user 3");
const matchByUser4 = getMessage(channel, user4, [], true, false, new Date('2020Z'), "match by user 4");
const matchByUser1FtUser2 = getMessage(channel, user1, [user2], true, false, new Date('2020Z'), "match by user 1 ft user 2");
const matchByUser1FtUser3 = getMessage(channel, user1, [user3], true, false, new Date('2020Z'), "match by user 1 ft user 3");
const matchByUser2FtUser1 = getMessage(channel, user2, [user1], true, false, new Date('2020Z'), "match by user 2 ft user 1");
const matchByUser2FtUser3 = getMessage(channel, user2, [user3], true, false, new Date('2020Z'), "match by user 2 ft user 3");
const matchByUser3FtUser1 = getMessage(channel, user3, [user1], true, false, new Date('2020Z'), "match by user 3 ft user 1");
const matchByUser3FtUser2 = getMessage(channel, user3, [user2], true, false, new Date('2020Z'), "match by user 3 ft user 2");
const matchByUser4FtUser2 = getMessage(channel, user4, [user2], true, false, new Date('2020Z'), "match by user 4 ft user 2");
const doubleMatchByUser1 = getMessage(channel, user1, [], 2, false, new Date('2021Z'), "match by user 1 with two images");
const statusMessage = getMessage(channel, botUser, [], false, true, new Date('2020Z'), "status");
const botMessage = getMessage(channel, botUser, [], true, false, new Date('2020Z'), "message from bot");
const textMessage = getMessage(channel, user1, [], false, false, new Date('2020Z'), "message with no image");

async function* yieldNothing() {}
async function* yieldMessages() {
	yield tagByUser1;
	yield matchByUser2;
	yield tagByUser2;
	yield matchByUser3;
	yield tagByUser3;
	yield matchByUser4;
	yield tagByUser4;
	yield matchByUser1;
}

const stateFree: GameStateFree = {
	status: 'free',
	scores: new Map(),
};
const stateAwaitingNext: GameStateAwaitingNext = {
	status: 'awaiting-next',
	scores: new Map(),
	match: matchByUser2,
	reminderTimer: null,
	timeUpTimer: null,
	disqualifiedFromRound: new Set(),
};
const stateAwaitingMatch: GameStateAwaitingMatch = {
	status: 'awaiting-match',
	scores: new Map(),
	tag: tagByUser1,
	disqualifiedFromRound: new Set(),
};
const stateInactive: GameStateInactive = {
	status: 'inactive',
};

function gameWithState(state: GameState, hasChatChannel: boolean = false): Game {
	return {
		channel,
		config: {
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: hasChatChannel ? chatChannel : null,
			autoRestart: false,
			period: null,
			locale: 'UTC',
			rankingStrategy: 'standardCompetition',
		},
		statusMessage: null,
		state,
	};
}

const states: GameState[] = [
	{ ...stateAwaitingMatch, tag: tagByUser1 } as GameStateAwaitingMatch,
	{ ...stateAwaitingNext, match: matchByUser2 } as GameStateAwaitingNext,
	{ ...stateAwaitingMatch, tag: tagByUser2 } as GameStateAwaitingMatch,
	{ ...stateAwaitingNext, match: matchByUser3 } as GameStateAwaitingNext,
	{ ...stateAwaitingMatch, tag: tagByUser3 } as GameStateAwaitingMatch,
	{ ...stateAwaitingNext, match: matchByUser4 } as GameStateAwaitingNext,
	{ ...stateAwaitingMatch, tag: tagByUser4 } as GameStateAwaitingMatch,
	{ ...stateAwaitingNext, match: matchByUser1 } as GameStateAwaitingNext,
];

const gameAwaitingMatch: Game = {
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
	statusMessage,
	state: {
		status: 'awaiting-match',
		scores: new Map([
			[user1, 1],
			[user2, 2],
			[user3, 3],
			[user4, 4],
		]),
		tag: tagByUser1,
	} as GameStateAwaitingMatch,
};

describe("handleMessage", () => {
	beforeEach(() => {
		jest.spyOn(console, 'log').mockImplementation();
		mockMessageHasImage.mockReturnValue(true);
		mockGetMessageImages.mockImplementation((message) => [...message.attachments.values()]);
		mockGetMessageUsers.mockImplementation((message) => new Set([message.author!, ...message.mentions.users.values()]));
		mockDeleteMessage.mockResolvedValue();
	});

	describe("recount mode", () => {
		it("throws an error if it finds itself starting from an inactive state", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(textMessage);
			expect(async () => {
				await m.handleMessage(gameWithState(stateInactive), textMessage, 'recount');
			}).rejects.toThrowError();
			expect(mockSend).not.toHaveBeenCalled();
			expect(mockDeleteMessage).not.toHaveBeenCalled();
		});

		it("ignores messages sent by the bot", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(textMessage);
			expect(await m.handleMessage(gameWithState(stateFree), botMessage, 'recount')).toBeNull();
			expect(await m.handleMessage(gameWithState(stateAwaitingMatch), botMessage, 'recount')).toBeNull();
			expect(await m.handleMessage(gameWithState(stateAwaitingNext), botMessage, 'recount')).toBeNull();
			expect(mockSend).not.toHaveBeenCalled();
			expect(mockDeleteMessage).not.toHaveBeenCalled();
		});

		it("ignores messages with no images", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(textMessage);
			mockMessageHasImage.mockReturnValue(false);
			expect(await m.handleMessage(gameWithState(stateFree), textMessage, 'recount')).toBeNull();
			expect(await m.handleMessage(gameWithState(stateAwaitingMatch), textMessage, 'recount')).toBeNull();
			expect(await m.handleMessage(gameWithState(stateAwaitingNext), textMessage, 'recount')).toBeNull();
			expect(mockSend).not.toHaveBeenCalled();
			expect(mockDeleteMessage).not.toHaveBeenCalled();
		});

		it("throws an exception if an unexpected state is passed in", async () => {
			expect(async () => {
				await m.handleMessage(gameWithState({ status: 'invalid' } as unknown as GameState), tagByUser1, 'live');
			}).rejects.toThrowError();
		});

		it("handles an initial tag", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			const result = await m.handleMessage(gameWithState(stateFree), tagByUser1, 'recount');
			expect(result).toHaveProperty('status', 'awaiting-match');
			expect(result!.scores!.size).toBe(0);
			expect(result).toHaveProperty('tag', tagByUser1);
			expect(mockDeleteMessage).not.toHaveBeenCalled();
		});

		it("makes no announcement on an initial tag", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			const result = await m.handleMessage(gameWithState(stateFree), tagByUser1, 'recount');
			expect(result).toHaveProperty('status', 'awaiting-match');
			expect(mockSend).not.toHaveBeenCalled();
		});

		it("allows and handles a match from anybody", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			const data: [Message, Message, Set<User>][] = [
				// Usually allowed
				[tagByUser1, matchByUser2, new Set()],
				[tagByUser1, matchByUser2FtUser3, new Set()],
				[tagByUser1FtUser2, matchByUser3, new Set()],
				[tagByUser1, matchByUser2, new Set([user3])],

				// Usually disallowed
				[tagByUser1, matchByUser1, new Set()],
				[tagByUser1, matchByUser1FtUser2, new Set()],
				[tagByUser1, matchByUser2FtUser1, new Set()],
				[tagByUser1FtUser2, matchByUser1, new Set()],
				[tagByUser1FtUser2, matchByUser2, new Set()],
				[tagByUser1FtUser2, matchByUser1FtUser2, new Set()],
				[tagByUser1FtUser2, matchByUser2FtUser1, new Set()],
				[tagByUser1FtUser2, matchByUser2FtUser3, new Set()],
				[tagByUser1FtUser2, matchByUser3FtUser2, new Set()],
				[tagByUser1FtUser2, matchByUser1FtUser3, new Set()],
				[tagByUser1FtUser2, matchByUser3FtUser1, new Set()],
				[tagByUser4, matchByUser1, new Set([user1])],
				[tagByUser4, matchByUser1FtUser2, new Set([user1])],
				[tagByUser4, matchByUser2FtUser1, new Set([user1])],
			];
			for (const [tag, match, disqualifiedFromRound] of data) {
				const result = await m.handleMessage(gameWithState({
					...stateAwaitingMatch,
					tag,
					disqualifiedFromRound,
				} as GameStateAwaitingMatch), match, 'recount');
				expect(result).toHaveProperty('status', 'awaiting-next');
				expect(result!.scores!.size).toBeGreaterThan(0);
				expect(result).toHaveProperty('match', match);
				expect(mockDeleteMessage).not.toHaveBeenCalled();
			}
		});

		it("awards points to the correct users", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			for (const [tag, match] of [
				// Usually allowed
				[tagByUser1, matchByUser2],
				[tagByUser1, matchByUser2FtUser3],
				[tagByUser1FtUser2, matchByUser3],

				// Usually disallowed
				[tagByUser1, matchByUser1],
				[tagByUser1, matchByUser1FtUser2],
				[tagByUser1, matchByUser2FtUser1],
				[tagByUser1FtUser2, matchByUser1],
				[tagByUser1FtUser2, matchByUser2],
				[tagByUser1FtUser2, matchByUser1FtUser2],
				[tagByUser1FtUser2, matchByUser2FtUser1],
				[tagByUser1FtUser2, matchByUser2FtUser3],
				[tagByUser1FtUser2, matchByUser3FtUser2],
				[tagByUser1FtUser2, matchByUser1FtUser3],
				[tagByUser1FtUser2, matchByUser3FtUser1],
			]) {
				const result = await m.handleMessage(gameWithState({
					...stateAwaitingMatch,
					tag,
				} as GameStateAwaitingMatch), match, 'recount');
				expect(result).toHaveProperty('status', 'awaiting-next');
				const expectedAwarded = [match.author, ...match.mentions.users.values()]
				expect(result!.scores!.size).toBe(expectedAwarded.length);
				for (const user of expectedAwarded) {
					expect(result!.scores!.get(user)).toBe(1);
				}
			}
		});

		it("increments score where users already have score", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser2);
			const game = gameWithState({
				...stateAwaitingMatch,
				tag: tagByUser1,
			} as GameStateAwaitingMatch);
			game.state.scores = new Map([[user2, 1]]);
			const result = await m.handleMessage(game, matchByUser2, 'recount');
			expect(result).toHaveProperty('status', 'awaiting-next');
			expect(result!.scores!.size).toBe(1);
			expect(result!.scores!.get(user2)).toBe(2);
		});

		it("makes no announcement on a match", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser2);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingMatch,
				tag: tagByUser1,
			} as GameStateAwaitingMatch), matchByUser2, 'recount');
			expect(result).toHaveProperty('status', 'awaiting-next');
			expect(mockSend).not.toHaveBeenCalled();
		});

		it("accepts multiple images for a tag match and doesn't post a warning", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(textMessage);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingMatch,
				tag: tagByUser4,
			} as GameStateAwaitingMatch, true), doubleMatchByUser1, 'recount');
			expect(result).toHaveProperty('status', 'awaiting-next');
			expect(mockSend).not.toHaveBeenCalled();
		});

		it("allows and handles a followup tag from anybody", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser1);
			for (const [match, tag] of [
				// Always allowed
				[matchByUser1, tagByUser1],
				[matchByUser1, tagByUser1FtUser2],
				[matchByUser1, tagByUser2FtUser1],
				[matchByUser1FtUser2, tagByUser1],
				[matchByUser1FtUser2, tagByUser2],
				[matchByUser1FtUser2, tagByUser1FtUser2],
				[matchByUser1FtUser2, tagByUser2FtUser1],
				[matchByUser1FtUser2, tagByUser3FtUser2],
				[matchByUser1FtUser2, tagByUser3FtUser1],
				[matchByUser1FtUser2, tagByUser1FtUser3],
				[matchByUser1FtUser2, tagByUser2FtUser3],

				// Usually disallowed
				[matchByUser1, tagByUser2],
				[matchByUser1FtUser2, tagByUser3],
				[matchByUser1, tagByUser2FtUser3],
			]) {
				const result = await m.handleMessage(gameWithState({
					...stateAwaitingNext,
					match,
				} as GameStateAwaitingNext), tag, 'recount');
				expect(result).toHaveProperty('status', 'awaiting-match');
				expect(result!.scores!.size).toBe(0); // The state we passed in has a clean scoreboard; if it's still empty no new scores have been given
				expect(result).toHaveProperty('tag', tag);
				expect(mockDeleteMessage).not.toHaveBeenCalled();
			}
		});

		it("makes no announcement on a followup tag", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser1);
			for (const [match, tag] of [
				[matchByUser1, tagByUser1], // Always allowed
				[matchByUser1, tagByUser2], // Usually disallowed
			]) {
				const result = await m.handleMessage(gameWithState({
					...stateAwaitingNext,
					match,
				} as GameStateAwaitingNext), tag, 'recount');
				expect(result).toHaveProperty('status', 'awaiting-match');
				expect(mockSend).not.toHaveBeenCalled();
			}
		});

		it("doesn't care if the followup tag is late or not", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser1);
			for (const [match, tag] of [
				[matchByUser1, tagByUser1],
				[matchByUser1, lateTagByUser1],
			]) {
				const game = gameWithState({
					...stateAwaitingNext,
					match,
				} as GameStateAwaitingNext);
				game.config.nextTagTimeLimit = 1e3 * 60;
				const result = await m.handleMessage(game, tag, 'recount');
				expect(result).toHaveProperty('status', 'awaiting-match');
				expect(mockSend).not.toHaveBeenCalled();
			}
		});
	});

	describe("live mode", () => {
		it("ignores messages sent by the bot", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(botMessage);
			expect(await m.handleMessage(gameWithState(stateFree), botMessage, 'live')).toBeNull();
			expect(await m.handleMessage(gameWithState(stateAwaitingMatch), botMessage, 'live')).toBeNull();
			expect(await m.handleMessage(gameWithState(stateAwaitingNext), botMessage, 'live')).toBeNull();
			expect(await m.handleMessage(gameWithState(stateInactive), botMessage, 'live')).toBeNull();
			expect(mockSend).not.toHaveBeenCalled();
			expect(mockDeleteMessage).not.toHaveBeenCalled();
		});

		it("ignores messages with no images", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(textMessage);
			mockMessageHasImage.mockReturnValue(false);
			expect(await m.handleMessage(gameWithState(stateFree), textMessage, 'live')).toBeNull();
			expect(await m.handleMessage(gameWithState(stateAwaitingMatch), textMessage, 'live')).toBeNull();
			expect(await m.handleMessage(gameWithState(stateAwaitingNext), textMessage, 'live')).toBeNull();
			expect(await m.handleMessage(gameWithState(stateInactive), textMessage, 'live')).toBeNull();
			expect(mockSend).not.toHaveBeenCalled();
			expect(mockDeleteMessage).not.toHaveBeenCalled();
		});

		it("throws an exception if an unexpected state is passed in", async () => {
			expect(async () => {
				await m.handleMessage(gameWithState({ status: 'invalid' } as unknown as GameState), tagByUser1, 'live');
			}).rejects.toThrowError();
		});

		it("handles an initial tag", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			const result = await m.handleMessage(gameWithState(stateFree), tagByUser1, 'live');
			expect(result).toHaveProperty('status', 'awaiting-match');
			expect(result!.scores!.size).toBe(0);
			expect(result).toHaveProperty('tag', tagByUser1);
			expect(mockDeleteMessage).not.toHaveBeenCalled();
		});

		it("makes no announcement on an initial tag if there is no chat channel", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			const result = await m.handleMessage(gameWithState(stateFree, false), tagByUser1, 'live');
			expect(result).toHaveProperty('status', 'awaiting-match');
			expect(mockSend).not.toHaveBeenCalled();
		});

		it("makes an announcement on an initial tag if there is a chat channel", async () => {
			const mockSendToGame = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			const mockSendToChat = jest.spyOn(chatChannel, 'send').mockResolvedValue(textMessage);
			const result = await m.handleMessage(gameWithState(stateFree, true), tagByUser1, 'live');
			expect(result).toHaveProperty('status', 'awaiting-match');
			expect(mockSendToGame).not.toHaveBeenCalled();
			expect(mockSendToChat).toHaveBeenCalledTimes(1);
		});

		it("allows and handles a match from anyone not disqualified who didn't author or get mentioned in the tag", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			for (const [tag, match] of [
				[tagByUser1, matchByUser2],
				[tagByUser1, matchByUser2FtUser3],
				[tagByUser1FtUser2, matchByUser3],
			]) {
				const result = await m.handleMessage(gameWithState({
					...stateAwaitingMatch,
					tag,
				} as GameStateAwaitingMatch), match, 'live');
				expect(result).toHaveProperty('status', 'awaiting-next');
				expect(result!.scores!.size).toBeGreaterThan(0);
				expect(result).toHaveProperty('match', match);
				expect(mockDeleteMessage).not.toHaveBeenCalled();
			}
		});

		it("rejects and deletes a match from someone or mentioning someone who authored or mentioned the tag", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			for (const [tag, match] of [
				[tagByUser1, matchByUser1],
				[tagByUser1, matchByUser1FtUser2],
				[tagByUser1, matchByUser2FtUser1],
				[tagByUser1FtUser2, matchByUser1],
				[tagByUser1FtUser2, matchByUser2],
				[tagByUser1FtUser2, matchByUser1FtUser2],
				[tagByUser1FtUser2, matchByUser2FtUser1],
				[tagByUser1FtUser2, matchByUser2FtUser3],
				[tagByUser1FtUser2, matchByUser3FtUser2],
				[tagByUser1FtUser2, matchByUser1FtUser3],
				[tagByUser1FtUser2, matchByUser3FtUser1],
			]) {
				const result = await m.handleMessage(gameWithState({
					...stateAwaitingMatch,
					tag,
				} as GameStateAwaitingMatch), match, 'live');
				expect(result).toBeNull();
				expect(mockDeleteMessage).toHaveBeenCalledTimes(1);
				mockDeleteMessage.mockClear();
			}
		});

		it("rejects and deletes a match from someone or mentioning someone disqualified from the current round", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser1);
			const data: [Set<User>, Message][] = [
				[new Set([user1]), matchByUser1],
				[new Set([user1]), matchByUser1FtUser2],
				[new Set([user1]), matchByUser2FtUser1],
				[new Set([user1, user2]), matchByUser1],
				[new Set([user1, user2]), matchByUser2],
				[new Set([user1, user2]), matchByUser1FtUser2],
				[new Set([user1, user2]), matchByUser2FtUser1],
				[new Set([user1, user2]), matchByUser2FtUser3],
				[new Set([user1, user2]), matchByUser3FtUser2],
				[new Set([user1, user2]), matchByUser1FtUser3],
				[new Set([user1, user2]), matchByUser3FtUser1],
			];
			for (const [disqualifiedFromRound, match] of data) {
				const result = await m.handleMessage(gameWithState({
					...stateAwaitingMatch,
					tag: tagByUser4,
					disqualifiedFromRound,
				} as GameStateAwaitingMatch), match, 'live');
				expect(result).toBeNull();
				expect(mockDeleteMessage).toHaveBeenCalledTimes(1);
				mockDeleteMessage.mockClear();
			}
		});

		it("warns a user if their match post was rejected for being by a tag author, in the game channel if there is no chat channel", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser1);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingMatch,
				tag: tagByUser1,
			} as GameStateAwaitingMatch, false), matchByUser1, 'live');
			expect(result).toBeNull();
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it("warns a user if their match post was rejected for being by a tag author, in the chat channel if there is one", async () => {
			const mockSendToGame = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser1);
			const mockSendToChat = jest.spyOn(chatChannel, 'send').mockResolvedValue(textMessage);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingMatch,
				tag: tagByUser1,
			} as GameStateAwaitingMatch, true), matchByUser1, 'live');
			expect(result).toBeNull();
			expect(mockSendToGame).not.toHaveBeenCalled();
			expect(mockSendToChat).toHaveBeenCalledTimes(1);
		});

		it("warns a user if their match post was rejected for being disqualified, in the game channel if there is no chat channel", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser1);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingMatch,
				tag: tagByUser4,
				disqualifiedFromRound: new Set([user1]),
			} as GameStateAwaitingMatch, false), matchByUser1, 'live');
			expect(result).toBeNull();
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it("warns a user if their match post was rejected for being disqualified, in the chat channel if there is one", async () => {
			const mockSendToGame = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser1);
			const mockSendToChat = jest.spyOn(chatChannel, 'send').mockResolvedValue(textMessage);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingMatch,
				tag: tagByUser4,
				disqualifiedFromRound: new Set([user1]),
			} as GameStateAwaitingMatch, true), matchByUser1, 'live');
			expect(result).toBeNull();
			expect(mockSendToGame).not.toHaveBeenCalled();
			expect(mockSendToChat).toHaveBeenCalledTimes(1);
		});

		it("persists the list of disqualified players on a new match", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser1);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingMatch,
				tag: tagByUser2,
				disqualifiedFromRound: new Set([user4]),
			} as GameStateAwaitingMatch), matchByUser1, 'live');
			expect(result).toHaveProperty('status', 'awaiting-next');
			expect((result as GameStateAwaitingNext).disqualifiedFromRound.has(user4)).toBe(true);
		});

		it("awards points to the correct users", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			for (const [tag, match] of [
				[tagByUser1, matchByUser2],
				[tagByUser1, matchByUser2FtUser3],
				[tagByUser1FtUser2, matchByUser3],
			]) {
				const result = await m.handleMessage(gameWithState({
					...stateAwaitingMatch,
					tag,
				} as GameStateAwaitingMatch), match, 'live');
				expect(result).toHaveProperty('status', 'awaiting-next');
				const expectedAwarded = [match.author, ...match.mentions.users.values()]
				expect(result!.scores!.size).toBe(expectedAwarded.length);
				for (const user of expectedAwarded) {
					expect(result!.scores!.get(user)).toBe(1);
				}
			}
		});

		it("increments score where users already have score", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser2);
			const game = gameWithState({
				...stateAwaitingMatch,
				tag: tagByUser1,
			} as GameStateAwaitingMatch);
			game.state.scores = new Map([[user2, 1]]);
			const result = await m.handleMessage(game, matchByUser2, 'live');
			expect(result).toHaveProperty('status', 'awaiting-next');
			expect(result!.scores!.size).toBe(1);
			expect(result!.scores!.get(user2)).toBe(2);
		});

		it("makes no announcement on a match if there is no chat channel", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser2);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingMatch,
				tag: tagByUser1,
			} as GameStateAwaitingMatch, false), matchByUser2, 'live');
			expect(result).toHaveProperty('status', 'awaiting-next');
			expect(mockSend).not.toHaveBeenCalled();
		});

		it("makes an announcement on a match if there is a chat channel", async () => {
			const mockSendToGame = jest.spyOn(channel, 'send').mockResolvedValue(matchByUser2);
			const mockSendToChat = jest.spyOn(chatChannel, 'send').mockResolvedValue(textMessage);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingMatch,
				tag: tagByUser1,
			} as GameStateAwaitingMatch, true), matchByUser2, 'live');
			expect(result).toHaveProperty('status', 'awaiting-next');
			expect(mockSendToGame).not.toHaveBeenCalled();
			expect(mockSendToChat).toHaveBeenCalledTimes(1);
			expect(mockSendToChat).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.arrayContaining([expect.objectContaining({ title: "New tag match" })])}));
		});

		it("accepts multiple images for a tag match but warns the user in case they meant to post them separately (in game channel if there is no chat channel)", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(textMessage);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingMatch,
				tag: tagByUser4,
			} as GameStateAwaitingMatch, false), doubleMatchByUser1, 'live');
			expect(result).toHaveProperty('status', 'awaiting-next');
			expect(mockSend).toHaveBeenCalledTimes(1);
			expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringMatching(/tag match with more than one image/i) }));
		});

		it("accepts multiple images for a tag match but warns the user in case they meant to post them separately (in chat channel if there is one)", async () => {
			const mockSendToGame = jest.spyOn(channel, 'send').mockResolvedValue(textMessage);
			const mockSendToChat = jest.spyOn(chatChannel, 'send').mockResolvedValue(textMessage);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingMatch,
				tag: tagByUser4,
			} as GameStateAwaitingMatch, true), doubleMatchByUser1, 'live');
			expect(result).toHaveProperty('status', 'awaiting-next');
			expect(mockSendToGame).not.toHaveBeenCalled();
			expect(mockSendToChat).toHaveBeenCalledTimes(2);
			expect(mockSendToChat).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringMatching(/tag match with more than one image/i) }));
		});

		it("allows and handles a followup tag as long as it is posted by or mentions anyone who posted or was mentioned in the match", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			for (const [match, tag] of [
				[matchByUser1, tagByUser1],
				[matchByUser1, tagByUser1FtUser2],
				[matchByUser1, tagByUser2FtUser1],
				[matchByUser1FtUser2, tagByUser1],
				[matchByUser1FtUser2, tagByUser2],
				[matchByUser1FtUser2, tagByUser1FtUser2],
				[matchByUser1FtUser2, tagByUser2FtUser1],
				[matchByUser1FtUser2, tagByUser3FtUser2],
				[matchByUser1FtUser2, tagByUser3FtUser1],
				[matchByUser1FtUser2, tagByUser1FtUser3],
				[matchByUser1FtUser2, tagByUser2FtUser3],
			]) {
				const result = await m.handleMessage(gameWithState({
					...stateAwaitingNext,
					match,
				} as GameStateAwaitingNext), tag, 'live');
				expect(result).toHaveProperty('status', 'awaiting-match');
				expect(result!.scores!.size).toBe(0); // The state we passed in has a clean scoreboard; if it's still empty no new scores have been given
				expect(result).toHaveProperty('tag', tag);
				expect(mockDeleteMessage).not.toHaveBeenCalled();
			}
		});

		it("makes no announcement of a followup tag if there is no chat channel", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
			} as GameStateAwaitingNext, false), tagByUser1, 'live');
			expect(result).toHaveProperty('status', 'awaiting-match');
			expect(mockSend).not.toHaveBeenCalled();
		});

		it("makes an announcement of a followup tag if there is a chat channel", async () => {
			const mockSendToGame = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			const mockSendToChat = jest.spyOn(chatChannel, 'send').mockResolvedValue(textMessage);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
			} as GameStateAwaitingNext, true), tagByUser1, 'live');
			expect(result).toHaveProperty('status', 'awaiting-match');
			expect(mockSendToGame).not.toHaveBeenCalled();
			expect(mockSendToChat).toHaveBeenCalledTimes(1);
		});

		it("clears the list of disqualified players on a new tag", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
				disqualifiedFromRound: new Set([user4]),
			} as GameStateAwaitingNext), tagByUser1, 'live');
			expect(result).toHaveProperty('disqualifiedFromRound.size', 0);
		});

		it("rejects and deletes a new tag if it's a disallowed author", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser2);
			for (const [match, tag] of [
				[matchByUser1, tagByUser2],
				[matchByUser1FtUser2, tagByUser3],
				[matchByUser1, tagByUser2FtUser3],
			]) {
				const result = await m.handleMessage(gameWithState({
					...stateAwaitingNext,
					match,
				} as GameStateAwaitingNext), tag, 'live');
				expect(result).toBeNull();
				expect(mockDeleteMessage).toHaveBeenCalledTimes(1);
				expect(mockDeleteMessage).toHaveBeenCalledWith(tag);
				mockDeleteMessage.mockClear();
			}
		});

		it("sends a message to the game channel if a new tag was disallowed and there is no chat channel", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser2);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
			} as GameStateAwaitingNext), tagByUser2, 'live');
			expect(result).toBeNull();
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it("sends a message to the chat channel instead of the game channel if a new tag was disallowed and there is a chat channel", async () => {
			const mockSendToGame = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser2);
			const mockSendToChat = jest.spyOn(chatChannel, 'send').mockResolvedValue(textMessage);
			const result = await m.handleMessage(gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
			} as GameStateAwaitingNext, true), tagByUser2, 'live');
			expect(result).toBeNull();
			expect(mockSendToGame).not.toHaveBeenCalled();
			expect(mockSendToChat).toHaveBeenCalledTimes(1);
		});

		it("deletes images posted to a game in the inactive state", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			const result = await m.handleMessage(gameWithState(stateInactive), tagByUser1, 'live');
			expect(result).toBeNull();
			expect(mockDeleteMessage).toHaveBeenCalledTimes(1);
			expect(mockDeleteMessage).toHaveBeenCalledWith(tagByUser1);
		});

		it("informs (in the game channel if there is no chat channel) a user who posted an image to a game in the inactive state", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			const result = await m.handleMessage(gameWithState(stateInactive, false), tagByUser1, 'live');
			expect(result).toBeNull();
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it("informs (in the chat channel if it is set) a user who posted an image to a game in the inactive state", async () => {
			const mockSendToGame = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			const mockSendToChat = jest.spyOn(chatChannel, 'send').mockResolvedValue(textMessage);
			const result = await m.handleMessage(gameWithState(stateInactive, true), tagByUser1, 'live');
			expect(result).toBeNull();
			expect(mockSendToGame).not.toHaveBeenCalled();
			expect(mockSendToChat).toHaveBeenCalledTimes(1);
		});

		it("accepts the tag if it's within the time limit", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(tagByUser1);
			const game = gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
			} as GameStateAwaitingNext);
			game.config.nextTagTimeLimit = 1e3 * 60;
			const result = await m.handleMessage(game, tagByUser1, 'live');
			expect(result).toHaveProperty('status', 'awaiting-match');
			expect(mockSend).not.toHaveBeenCalled();
		});

		it("deletes the new tag if it's outside of the time limit", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(lateTagByUser1);
			const mockRecount = jest.spyOn(m, 'recount').mockResolvedValue(stateAwaitingMatch);
			const game = gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
			} as GameStateAwaitingNext);
			game.config.nextTagTimeLimit = 1e3 * 60;
			const result = await m.handleMessage(game, lateTagByUser1, 'live');
			expect(mockDeleteMessage).toHaveBeenCalledWith(lateTagByUser1);
		});

		it("deletes the previous match if the new tag is outside of the time limit", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(lateTagByUser1);
			const mockRecount = jest.spyOn(m, 'recount').mockResolvedValue(stateAwaitingMatch);
			const game = gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
			} as GameStateAwaitingNext);
			game.config.nextTagTimeLimit = 1e3 * 60;
			const result = await m.handleMessage(game, lateTagByUser1, 'live');
			expect(mockDeleteMessage).toHaveBeenCalledWith(matchByUser1);
		});

		it("triggers a recount if the tag is outside of the time limit", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(lateTagByUser1);
			const mockRecount = jest.spyOn(m, 'recount').mockResolvedValue(stateAwaitingMatch);
			const game = gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
			} as GameStateAwaitingNext);
			game.config.nextTagTimeLimit = 1e3 * 60;
			const result = await m.handleMessage(game, lateTagByUser1, 'live');
			expect(mockRecount).toHaveBeenCalledTimes(1);
		});

		it("posts a message (in the game channel if there is no chat channel) saying what happened if the tag was outside of the time limit", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(lateTagByUser1);
			const mockRecount = jest.spyOn(m, 'recount').mockResolvedValue(stateAwaitingMatch);
			const game = gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
			} as GameStateAwaitingNext, false);
			game.config.nextTagTimeLimit = 1e3 * 60;
			const result = await m.handleMessage(game, lateTagByUser1, 'live');
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it("posts a message (in the chat channel if there is one) saying what happened if the tag was outside of the time limit", async () => {
			const mockSendToGame = jest.spyOn(channel, 'send').mockResolvedValue(lateTagByUser1);
			const mockSendToChat = jest.spyOn(chatChannel, 'send').mockResolvedValue(textMessage);
			const mockRecount = jest.spyOn(m, 'recount').mockResolvedValue(stateAwaitingMatch);
			const game = gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
			} as GameStateAwaitingNext, true);
			game.config.nextTagTimeLimit = 1e3 * 60;
			const result = await m.handleMessage(game, lateTagByUser1, 'live');
			expect(mockSendToGame).not.toHaveBeenCalled();
			expect(mockSendToChat).toHaveBeenCalledTimes(1);
		});

		it("disqualifies everyone involved from the round if the tag was outside of the time limit", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(lateTagByUser1);
			const mockRecount = jest.spyOn(m, 'recount').mockResolvedValue(stateAwaitingMatch);
			const game = gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
			} as GameStateAwaitingNext, false);
			game.config.nextTagTimeLimit = 1e3 * 60;
			const result = await m.handleMessage(game, lateTagByUser1, 'live');
			expect((result as GameStateAwaitingMatch).disqualifiedFromRound.has(user1)).toBe(true);
		});

		it("preserves previously-disqualified players if the tag was outside of the time limit", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(lateTagByUser1);
			const mockRecount = jest.spyOn(m, 'recount').mockResolvedValue({ ...stateAwaitingMatch, disqualifiedFromRound: new Set([user2]) } as GameStateAwaitingMatch);
			const game = gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
			} as GameStateAwaitingNext, false);
			game.config.nextTagTimeLimit = 1e3 * 60;
			const result = await m.handleMessage(game, lateTagByUser1, 'live');
			expect((result as GameStateAwaitingMatch).disqualifiedFromRound.has(user2)).toBe(true);
		});

		it("combines newly-disqualified players if the tag was outside of the time limit", async () => {
			const mockSend = jest.spyOn(channel, 'send').mockResolvedValue(lateTagByUser1);
			const mockRecount = jest.spyOn(m, 'recount').mockResolvedValue({ ...stateAwaitingMatch, disqualifiedFromRound: new Set([user2]) } as GameStateAwaitingMatch);
			const game = gameWithState({
				...stateAwaitingNext,
				match: matchByUser1,
			} as GameStateAwaitingNext, false);
			game.config.nextTagTimeLimit = 1e3 * 60;
			const result = await m.handleMessage(game, lateTagByUser1, 'live');
			expect((result as GameStateAwaitingMatch).disqualifiedFromRound.has(user1)).toBe(true);
		});
	});
});

describe("recount", () => {
	beforeEach(() => {
		jest.spyOn(console, 'log').mockImplementation();
	});

	it("starts with a free state", async () => {
		const game = { ...gameAwaitingMatch, state: { ...gameAwaitingMatch.state } };
		mockGetAllMessagesSince.mockImplementation(yieldNothing);
		jest.spyOn(m, 'handleMessage').mockResolvedValue(null);
		const result = await m.recount(game);
		expect(result.status).toBe('free');
	});

	it("starts with an empty scoreboard", async () => {
		const game = { ...gameAwaitingMatch, state: { ...gameAwaitingMatch.state } };
		mockGetAllMessagesSince.mockImplementation(yieldNothing);
		jest.spyOn(m, 'handleMessage').mockResolvedValue(null);
		const result = await m.recount(game);
		expect(result!.scores!.size).toBe(0);
	});

	it("doesn't touch the passed game object", async () => {
		const game = { ...gameAwaitingMatch, state: { ...gameAwaitingMatch.state } };
		mockGetAllMessagesSince.mockImplementation(yieldNothing);
		jest.spyOn(m, 'handleMessage').mockResolvedValue(null);
		await m.recount(game);
		expect(game.state.status).toBe('awaiting-match');
		expect(game!.state!.scores!.size).toBe(4);
	});

	it("passes each message through to the handleMessage method", async () => {
		const game = { ...gameAwaitingMatch, state: { ...gameAwaitingMatch.state } };
		mockGetAllMessagesSince.mockImplementation(yieldMessages);
		const mockHandleMessage = jest.spyOn(m, 'handleMessage').mockResolvedValue(null);
		await m.recount(game);
		expect(mockHandleMessage).toHaveBeenCalledTimes(8);
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.any(Object), tagByUser1, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.any(Object), matchByUser2, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.any(Object), tagByUser2, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.any(Object), matchByUser3, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.any(Object), tagByUser3, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.any(Object), matchByUser4, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.any(Object), tagByUser4, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.any(Object), matchByUser1, expect.anything());
	});

	it("calls the handleMessage method in 'recount' mode", async () => {
		const game = { ...gameAwaitingMatch, state: { ...gameAwaitingMatch.state } };
		mockGetAllMessagesSince.mockImplementation(yieldMessages);
		const mockHandleMessage = jest.spyOn(m, 'handleMessage').mockResolvedValue(null);
		await m.recount(game);
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), 'recount');
	});

	it("ignores nulls returned by handleMessage", async () => {
		const game = { ...gameAwaitingMatch, state: { ...gameAwaitingMatch.state } };
		mockGetAllMessagesSince.mockImplementation(yieldMessages);
		const mockHandleMessage = jest.spyOn(m, 'handleMessage').mockResolvedValue(null);
		await m.recount(game);
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.objectContaining({ state: expect.objectContaining({ status: 'free' }) }), matchByUser1, expect.anything());
	});

	it("passes through the new states to successive handleMessage calls", async () => {
		const game = { ...gameAwaitingMatch, state: { ...gameAwaitingMatch.state } };
		mockGetAllMessagesSince.mockImplementation(yieldMessages);
		const mockHandleMessage = jest.spyOn(m, 'handleMessage')
			.mockResolvedValueOnce(states[0])
			.mockResolvedValueOnce(states[1])
			.mockResolvedValueOnce(states[2])
			.mockResolvedValueOnce(states[3])
			.mockResolvedValueOnce(states[4])
			.mockResolvedValueOnce(states[5])
			.mockResolvedValueOnce(states[6])
			.mockResolvedValueOnce(states[7])
			.mockResolvedValue(null);
		await m.recount(game);
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.objectContaining({ state: expect.objectContaining({ status: 'free' }) }), tagByUser1, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.objectContaining({ state: states[0] }), matchByUser2, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.objectContaining({ state: states[1] }), tagByUser2, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.objectContaining({ state: states[2] }), matchByUser3, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.objectContaining({ state: states[3] }), tagByUser3, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.objectContaining({ state: states[4] }), matchByUser4, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.objectContaining({ state: states[5] }), tagByUser4, expect.anything());
		expect(mockHandleMessage).toHaveBeenCalledWith(expect.objectContaining({ state: states[6] }), matchByUser1, expect.anything());
	});

	it("returns the eventual state", async () => {
		const game = { ...gameAwaitingMatch, state: { ...gameAwaitingMatch.state } };
		mockGetAllMessagesSince.mockImplementation(yieldMessages);
		const mockHandleMessage = jest.spyOn(m, 'handleMessage')
			.mockResolvedValueOnce(states[0])
			.mockResolvedValueOnce(states[1])
			.mockResolvedValueOnce(states[2])
			.mockResolvedValueOnce(states[3])
			.mockResolvedValueOnce(states[4])
			.mockResolvedValueOnce(states[5])
			.mockResolvedValueOnce(states[6])
			.mockResolvedValueOnce(states[7])
			.mockResolvedValue(null);
		expect(await m.recount(game)).toBe(states[7]);
	});
});

describe("formatScores", () => {
	beforeEach(() => {
		mockToList.mockImplementation((strings: Set<string> | string[]) => [...strings].join(", "));
	});

	it("returns a different line for each score", () => {
		const result = m.formatScores(new Map([
			[user1, 1],
			[user2, 2],
			[user3, 2],
		]));
		const lines = result.split('\n');
		expect(lines).toContainEqual(expect.stringContaining("with 1:"));
		expect(lines).toContainEqual(expect.stringContaining("with 2:"));
		expect(lines.findIndex((line) => /with 1:/.test(line))).not.toEqual(lines.findIndex((line) => /with 2:/.test(line)));
	});

	it("returns each score's users on its line", () => {
		const result = m.formatScores(new Map([
			[user1, 1],
			[user2, 2],
			[user3, 2],
		]));
		const lines = result.split('\n');
		const score1Line = lines.find((line) => /with 1:/.test(line));
		expect(score1Line).toContain("<@100>");
		const score2Line = lines.find((line) => /with 2:/.test(line));
		expect(score2Line).toContain("<@200>");
		expect(score2Line).toContain("<@300>");
	});

	it("does not limit the number of scores shown by default", () => {
		const result = m.formatScores(new Map([
			[user1, 1],
			[user2, 2],
			[user3, 2],
			[user4, 4],
			[botUser, 42],
		]));
		const lines = result.split('\n');
		expect(lines).toContainEqual(expect.stringContaining("with 1:"));
		expect(lines).toContainEqual(expect.stringContaining("with 2:"));
		expect(lines).toContainEqual(expect.stringContaining("with 4:"));
		expect(lines).toContainEqual(expect.stringContaining("with 42:"));
	});

	it("sorts by score descending", () => {
		const result = m.formatScores(new Map([
			[user1, 1],
			[user2, 2],
			[user3, 2],
			[user4, 4],
		]));
		const lines = result.split('\n');
		const score1Index = lines.findIndex((line) => line.includes("with 1:"));
		const score2Index = lines.findIndex((line) => line.includes("with 2:"));
		const score4Index = lines.findIndex((line) => line.includes("with 4:"));
		expect(score4Index).toBeLessThan(score2Index);
		expect(score4Index).toBeLessThan(score1Index);
		expect(score2Index).toBeLessThan(score1Index);
	});

	it("limits the number of scores shown if asked to", () => {
		const result = m.formatScores(new Map([
			[user1, 1],
			[user2, 2],
			[user3, 2],
			[user4, 4],
		]), { max: 2 });
		const lines = result.split('\n');
		expect(lines).not.toContainEqual(expect.stringContaining("with 1:"));
		expect(lines).toContainEqual(expect.stringContaining("with 2:"));
		expect(lines).toContainEqual(expect.stringContaining("with 4:"));
	});

	it("outputs users with the same score in ID order", () => {
		const result1 = m.formatScores(new Map([
			[user1, 1],
			[user2, 1],
		]));
		expect(result1).toEqual(expect.stringContaining("<@100>, <@200>"));
		const result2 = m.formatScores(new Map([
			[user2, 1],
			[user1, 1],
		]));
		expect(result2).toEqual(expect.stringContaining("<@100>, <@200>"));
	});

	it("uses standard competition by default", () => {
		const mockGetRankingMapper = jest.spyOn(m, 'getRankingMapper').mockReturnValue(() => "");
		const result = m.formatScores(new Map([
			[user1, 1],
			[user2, 2],
			[user3, 2],
			[user4, 3],
		]));
		expect(m.getRankingMapper).toHaveBeenCalledWith('standardCompetition');
		expect(m.getRankingMapper).not.toHaveBeenCalledWith('modifiedCompetition');
		expect(m.getRankingMapper).not.toHaveBeenCalledWith('dense');
	});

	it("uses standard competition ranking when asked to", () => {
		const result = m.formatScores(new Map([
			[user1, 1],
			[user2, 2],
			[user3, 2],
			[user4, 3],
		]), { rankingStrategy: 'standardCompetition' });
		const lines = result.split('\n');
		const score1Line = lines.find((line) => line.includes("with 1:"));
		const score2Line = lines.find((line) => line.includes("with 2:"));
		const score3Line = lines.find((line) => line.includes("with 3:"));
		expect(score1Line).not.toMatch(/^Tied/);
		expect(score2Line).toMatch(/^Tied/);
		expect(score3Line).not.toMatch(/^Tied/);
		expect(score3Line).toMatch(/🥇 with/);
		expect(score2Line).toMatch(/🥈 with/);
		expect(score1Line).toMatch(/\b4th with/);
	});

	it("uses modified competition ranking when asked to", () => {
		const result = m.formatScores(new Map([
			[user1, 1],
			[user2, 2],
			[user3, 2],
			[user4, 3],
		]), { rankingStrategy: 'modifiedCompetition' });
		const lines = result.split('\n');
		const score1Line = lines.find((line) => line.includes("with 1:"));
		const score2Line = lines.find((line) => line.includes("with 2:"));
		const score3Line = lines.find((line) => line.includes("with 3:"));
		expect(score1Line).not.toMatch(/^Tied/);
		expect(score2Line).toMatch(/^Tied/);
		expect(score3Line).not.toMatch(/^Tied/);
		expect(score3Line).toMatch(/🥇 with/);
		expect(score2Line).toMatch(/🥉 with/);
		expect(score1Line).toMatch(/\b4th with/);
	});

	it("uses dense ranking when asked to", () => {
		const result = m.formatScores(new Map([
			[user1, 1],
			[user2, 2],
			[user3, 2],
			[user4, 3],
		]), { rankingStrategy: 'dense' });
		const lines = result.split('\n');
		const score1Line = lines.find((line) => line.includes("with 1:"));
		const score2Line = lines.find((line) => line.includes("with 2:"));
		const score3Line = lines.find((line) => line.includes("with 3:"));
		expect(score1Line).not.toMatch(/^Tied/);
		expect(score2Line).toMatch(/^Tied/);
		expect(score3Line).not.toMatch(/^Tied/);
		expect(score3Line).toMatch(/🥇 with/);
		expect(score2Line).toMatch(/🥈 with/);
		expect(score1Line).toMatch(/🥉 with/);
	});
});

describe("getScoresEmbedFields", () => {
	const game: Game = {
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
		statusMessage,
		state: {
			status: 'awaiting-match',
			scores: new Map([
				[user1, 1],
				[user2, 2],
				[user3, 3],
				[user4, 4],
			]),
			tag: tagByUser1,
		} as GameStateAwaitingMatch,
	};

	it("has a name attached to the first embed based on the format option", () => {
		expect(m.getScoresEmbedFields(game, 'brief')[0]).toHaveProperty('name', "Top scores");
		expect(m.getScoresEmbedFields(game, 'full')[0]).toHaveProperty('name', "Scores");
	});

	it("has no name attached to successive embeds", () => {
		const mockFormatScores = jest.spyOn(m, 'formatScores').mockReturnValue(new Array(128).fill(true).map((_, i) => `Line ${i + 1}`).join("\n"));
		const result = m.getScoresEmbedFields({
			...game,
			statusMessage: null,
		}, 'full');
		expect(result[result.length - 1]).toHaveProperty('name', "");
	});

	it("notes that there are no scores if the game is inactive", () => {
		const noScoresGame: Game = {
			...game,
			state: {
				...stateInactive,
			},
		};
		expect(m.getScoresEmbedFields(noScoresGame, 'brief')[0]).toHaveProperty('value', expect.stringMatching(/none/i));
		expect(m.getScoresEmbedFields(noScoresGame, 'full')[0]).toHaveProperty('value', expect.stringMatching(/none/i));
	});

	it("notes that there are no scores if there is no scores set", () => {
		const noScoresGame: Game = {
			...game,
			state: {
				...game.state,
				scores: undefined,
			},
		};
		expect(m.getScoresEmbedFields(noScoresGame, 'brief')[0]).toHaveProperty('value', expect.stringMatching(/none/i));
		expect(m.getScoresEmbedFields(noScoresGame, 'full')[0]).toHaveProperty('value', expect.stringMatching(/none/i));
	});

	it("notes that there are no scores if there are none", () => {
		const noScoresGame: Game = {
			...game,
			state: {
				...game.state,
				scores: new Map(),
			},
		};
		expect(m.getScoresEmbedFields(noScoresGame, 'brief')[0]).toHaveProperty('value', expect.stringMatching(/none/i));
		expect(m.getScoresEmbedFields(noScoresGame, 'full')[0]).toHaveProperty('value', expect.stringMatching(/none/i));
	});

	it("does not link to the status message in the last embed if there are no scores to show", () => {
		const noScoresGame: Game = {
			...game,
			state: {
				...game.state,
				scores: new Map(),
			},
		};
		{
			const embeds = m.getScoresEmbedFields(noScoresGame, 'brief');
			expect(embeds[embeds.length - 1]).not.toHaveProperty('value', expect.stringContaining(statusMessage.url));
		}
		{
			const embeds = m.getScoresEmbedFields(noScoresGame, 'full');
			expect(embeds[embeds.length - 1]).not.toHaveProperty('value', expect.stringContaining(statusMessage.url));
		}
	});

	it("uses the configured ranking strategy option", () => {
		const reconfiguredGame: Game = {
			...game,
			config: {
				...game.config,
				rankingStrategy: 'dense',
			},
		};
		const mockFormatScores = jest.spyOn(m, 'formatScores').mockReturnValue("all the scores");
		m.getScoresEmbedFields(reconfiguredGame, 'full');
		expect(mockFormatScores).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ rankingStrategy: 'dense' }));
	});

	it("shows all scores in full mode", () => {
		const mockFormatScores = jest.spyOn(m, 'formatScores').mockReturnValue("all the scores");
		const result = m.getScoresEmbedFields(game, 'full');
		expect(result[0]).toHaveProperty('value', expect.stringContaining("all the scores"));
		expect(mockFormatScores).toHaveBeenCalledTimes(1);
		expect(mockFormatScores).toHaveBeenCalledWith(game.state.scores, expect.not.objectContaining({ max: expect.anything() }));
	});

	it("shows just the top scores scores in brief mode", () => {
		const mockFormatScores = jest.spyOn(m, 'formatScores').mockReturnValue("the top scores");
		const result = m.getScoresEmbedFields(game, 'brief');
		expect(result[0]).toHaveProperty('value', expect.stringContaining("the top scores"));
		expect(mockFormatScores).toHaveBeenCalledTimes(1);
		expect(mockFormatScores).toHaveBeenCalledWith(game.state.scores, expect.objectContaining({ max: 3 }));
	});

	it("gives a link to the full scoreboard if it did not show all the scores", () => {
		const mockFormatScores = jest.spyOn(m, 'formatScores').mockReturnValue("the top scores");
		const result = m.getScoresEmbedFields(game, 'brief');
		expect(result[result.length - 1]).toHaveProperty('value', expect.stringContaining(game.statusMessage!.url));
	});

	it("does not give a link to the full scoreboard if it showed all the scores", () => {
		const mockFormatScores = jest.spyOn(m, 'formatScores').mockReturnValue("the top scores");
		{
			const result = m.getScoresEmbedFields({
				...game,
				state: {
					...game.state,
					scores: new Map([
						[user1, 1],
						[user2, 2],
						[user3, 3],
					]),
				},
			}, 'brief');
			expect(result[result.length - 1]).not.toHaveProperty('value', expect.stringContaining(game.statusMessage!.url));
		}
		{
			const result = m.getScoresEmbedFields({
				...game,
				state: {
					...game.state,
					scores: new Map([
						[user1, 1],
						[user2, 2],
						[user3, 3],
						[user4, 3],
					]),
				},
			}, 'brief');
			expect(result[result.length - 1]).not.toHaveProperty('value', expect.stringContaining(game.statusMessage!.url));
		}
	});

	it("shows some string (doesn't crash) if trying to give a link to the status message when unable", () => {
		const mockFormatScores = jest.spyOn(m, 'formatScores').mockReturnValue("the top scores");
		const result = m.getScoresEmbedFields({
			...game,
			statusMessage: null,
		}, 'brief');
		expect(result[0]).toHaveProperty('value', expect.any(String));
	});

	it("splits the scores into multiple embeds if necessary", () => {
		const mockFormatScores = jest.spyOn(m, 'formatScores').mockReturnValue(new Array(128).fill(true).map((_, i) => `Line ${i + 1}`).join("\n"));
		const result = m.getScoresEmbedFields({
			...game,
			statusMessage: null,
		}, 'full');
		expect(result.length).toBeGreaterThan(1);
		expect(result[0]).toHaveProperty('value', expect.stringMatching(/\bLine 1\b/));
		expect(result[result.length - 1]).toHaveProperty('value', expect.stringMatching(/\bLine 128\b/));
	});
});

describe("getChangedScores", () => {
	it("returns an empty map where there are no scores", () => {
		const result = m.getChangedScores(new Map(), new Map());
		expect(result.size).toBe(0);
	});

	it("returns an empty map where there are no changed scores", () => {
		const result = m.getChangedScores(new Map([
			[user1, 1],
			[user2, 2],
		]), new Map([
			[user2, 2],
			[user1, 1],
		]));
		expect(result.size).toBe(0);
	})

	it("returns changed scores", () => {
		const result = m.getChangedScores(new Map([
			[user1, 1],
			[user2, 2],
			[user3, 2],
		]), new Map([
			[user1, 1],
			[user2, 3],
			[user3, 1],
		]));
		expect(result.get(user1)).toBeUndefined();
		expect(result.get(user2)).toHaveProperty('before', 2);
		expect(result.get(user2)).toHaveProperty('after', 3);
		expect(result.get(user3)).toHaveProperty('before', 2);
		expect(result.get(user3)).toHaveProperty('after', 1);
	});

	it("notices disappearance", () => {
		const result = m.getChangedScores(new Map([
			[user1, 1],
		]), new Map());
		expect(result.get(user1)).toHaveProperty('before', 1);
		expect(result.get(user1)).toHaveProperty('after', 0);
	});

	it("notices appearance", () => {
		const result = m.getChangedScores(new Map(), new Map([
			[user1, 1],
		]));
		expect(result.get(user1)).toHaveProperty('before', 0);
		expect(result.get(user1)).toHaveProperty('after', 1);
	});
});

describe("getScoreChangesEmbedField", () => {
	it("returns an object with name and value", () => {
		const result = m.getScoreChangesEmbedField(new Map());
		expect(result).toHaveProperty('name');
		expect(result).toHaveProperty('value');
	});

	it("lists all users in the passed map on different lines", () => {
		const result = m.getScoreChangesEmbedField(new Map([
			[user1, { before: 0, after: 1 }],
			[user2, { before: 1, after: 0 }],
		]));
		const lines = result.value.split('\n');
		expect(lines).toContainEqual(expect.stringContaining("<@100>"));
		expect(lines).toContainEqual(expect.stringContaining("<@200>"));
		expect(lines.findIndex((line) => /<@100>/.test(line))).not.toEqual(lines.findIndex((line) => /<@user-2>/.test(line)));
	});

	it("lists each user's score change", () => {
		const result = m.getScoreChangesEmbedField(new Map([
			[user1, { before: 1, after: 2 }],
			[user2, { before: 5, after: 4 }],
		]));
		const lines = result.value.split('\n');
		expect(lines).toContainEqual(expect.stringMatching(/<@100>.*\b1\b.*\b2\b/));
		expect(lines).toContainEqual(expect.stringMatching(/<@200>.*\b5\b.*\b4\b/));
	});
});
