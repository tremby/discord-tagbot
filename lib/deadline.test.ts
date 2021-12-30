import { getDeadlineTimestamp, getFormattedDeadline } from './deadline';
import { getGuild, getTextChannel, getUser, getMessage } from '../test/fixtures';

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user-1');
const user2 = getUser('user-2');

describe("getDeadlineTimestamp", () => {
	it("returns null if not awaiting a next tag (so there is no deadline)", () => {
		const game: Game = {
			channel,
			config: {
				nextTagTimeLimit: 42e3,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			},
			state: {
				status: 'free',
				scores: new Map(),
			} as GameStateFree,
			statusMessage: null,
		};
		expect(getDeadlineTimestamp(game)).toBeNull();
	});

	it("returns null if we are awaiting a tag but there is no time limit", () => {
		const game: Game = {
			channel,
			config: {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			},
			state: {
				status: 'awaiting-next',
				scores: new Map(),
				match: getMessage(channel, user1, [], true, false, new Date('2020Z'), "tag match"),
				reminderTimer: null,
				timeUpTimer: null,
			} as GameStateAwaitingNext,
			statusMessage: null,
		};
		expect(getDeadlineTimestamp(game)).toBeNull();
	});

	it("returns the expected timestamp", () => {
		const game: Game = {
			channel,
			config: {
				nextTagTimeLimit: 42e3,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			},
			state: {
				status: 'awaiting-next',
				scores: new Map(),
				match: getMessage(channel, user1, [], true, false, new Date('2020Z'), "tag match"),
				reminderTimer: null,
				timeUpTimer: null,
			} as GameStateAwaitingNext,
			statusMessage: null,
		};
		expect(getDeadlineTimestamp(game)).toEqual(new Date('2020Z').getTime() + 42e3);
	});
});

describe("getFormattedDeadline", () => {
	it("returns null if not awaiting a next tag (so there is no deadline)", () => {
		const game: Game = {
			channel,
			config: {
				nextTagTimeLimit: 42e3,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			},
			state: {
				status: 'free',
				scores: new Map(),
			} as GameStateFree,
			statusMessage: null,
		};
		expect(getFormattedDeadline(game)).toBeNull();
	});

	it("returns null if we are awaiting a tag but there is no time limit", () => {
		const game: Game = {
			channel,
			config: {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			},
			state: {
				status: 'awaiting-next',
				scores: new Map(),
				match: getMessage(channel, user1, [], true, false, new Date('2020Z'), "tag match"),
				reminderTimer: null,
				timeUpTimer: null,
			} as GameStateAwaitingNext,
			statusMessage: null,
		};
		expect(getFormattedDeadline(game)).toBeNull();
	});

	it("uses no format string by default", () => {
		const game: Game = {
			channel,
			config: {
				nextTagTimeLimit: 42e3,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			},
			state: {
				status: 'awaiting-next',
				scores: new Map(),
				match: getMessage(channel, user1, [], true, false, new Date('2020Z'), "tag match"),
				reminderTimer: null,
				timeUpTimer: null,
			} as GameStateAwaitingNext,
			statusMessage: null,
		};
		expect(getFormattedDeadline(game)).toMatch(/^<t:\d+>$/);
	});

	it("uses the specified format string", () => {
		const game: Game = {
			channel,
			config: {
				nextTagTimeLimit: 42e3,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			},
			state: {
				status: 'awaiting-next',
				scores: new Map(),
				match: getMessage(channel, user1, [], true, false, new Date('2020Z'), "tag match"),
				reminderTimer: null,
				timeUpTimer: null,
			} as GameStateAwaitingNext,
			statusMessage: null,
		};
		expect(getFormattedDeadline(game, "A")).toMatch(/^<t:\d+:A>$/);
	});

	it("uses the expected timestamp", () => {
		const game: Game = {
			channel,
			config: {
				nextTagTimeLimit: 42e3,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			},
			state: {
				status: 'awaiting-next',
				scores: new Map(),
				match: getMessage(channel, user1, [], true, false, new Date('2020Z'), "tag match"),
				reminderTimer: null,
				timeUpTimer: null,
			} as GameStateAwaitingNext,
			statusMessage: null,
		};
		expect(getFormattedDeadline(game)).toMatch(new RegExp(`\\b${Math.round((new Date('2020Z').getTime() + 42e3) / 1e3)}\\b`));
	});
});
