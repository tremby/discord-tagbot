import { getDefaultConfig, serializeConfig, getConfigEmbedFields } from './config';
import { getGuild, getRole, getTextChannel } from '../test/fixtures';

describe('getDefaultConfig', () => {
	it("defaults the time limit to an hour", () => {
		expect(getDefaultConfig()).toHaveProperty('nextTagTimeLimit', 1e3 * 60 * 60);
	});

	it("defaults the judge roles to none", () => {
		const config = getDefaultConfig();
		expect(config).toHaveProperty('tagJudgeRoles');
		expect(config.tagJudgeRoles.size).toBe(0);
	});

	it("defaults the chat channel to none", () => {
		expect(getDefaultConfig()).toHaveProperty('chatChannel', null);
	});

	it("defaults auto-restart to false", () => {
		expect(getDefaultConfig()).toHaveProperty('autoRestart', false);
	});

	it("defaults period to null", () => {
		expect(getDefaultConfig()).toHaveProperty('period', null);
	});

	it("defaults locale to UTC", () => {
		expect(getDefaultConfig()).toHaveProperty('locale', 'UTC');
	});
});

describe('serializeConfig', () => {
	describe("next tag time limit", () => {
		it("keeps null as null", () => {
			const config: Config = {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			};
			expect(serializeConfig(config)).toHaveProperty('nextTagTimeLimit', null);
		});

		it("doesn't mess with a number", () => {
			const config: Config = {
				nextTagTimeLimit: 42,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			};
			expect(serializeConfig(config)).toHaveProperty('nextTagTimeLimit', 42);
		});
	});

	describe("judge roles", () => {
		it("outputs an empty array if there are none", () => {
			const config: Config = {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			};
			expect(serializeConfig(config)).toHaveProperty('tagJudgeRoleIds', []);
		});

		it("converts to IDs", () => {
			const guild = getGuild();
			const role1 = getRole(guild, 'role1');
			const role2 = getRole(guild, 'role2');
			const config: Config = {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set([role1, role2]),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			};
			expect(serializeConfig(config)).toHaveProperty('tagJudgeRoleIds', expect.arrayContaining(['role1', 'role2']));
			expect(serializeConfig(config)).toHaveProperty('tagJudgeRoleIds.length', 2);
		});
	});

	describe("chat channel", () => {
		it("keeps null as null", () => {
			const config: Config = {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			};
			expect(serializeConfig(config)).toHaveProperty('chatChannelId', null);
		});

		it("converts to ID", () => {
			const config: Config = {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set(),
				chatChannel: getTextChannel(getGuild(), "channel-1"),
				autoRestart: false,
				period: null,
				locale: 'UTC',
			};
			expect(serializeConfig(config)).toHaveProperty('chatChannelId', 'channel-1');
		});
	});

	describe("auto-restart", () => {
		it("reads false", () => {
			const config: Config = {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			};
			expect(serializeConfig(config)).toHaveProperty('autoRestart', false);
		});

		it("reads true", () => {
			const config: Config = {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: true,
				period: null,
				locale: 'UTC',
			};
			expect(serializeConfig(config)).toHaveProperty('autoRestart', true);
		});
	});

	describe("period", () => {
		it("keeps null as null", () => {
			const config: Config = {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
			};
			expect(serializeConfig(config)).toHaveProperty('period', null);
		});

		it("reads strings", () => {
			const config: Config = {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: true,
				period: 'month',
				locale: 'UTC',
			};
			expect(serializeConfig(config)).toHaveProperty('period', 'month');
		});
	});

	describe("locale", () => {
		it("reads strings", () => {
			const config: Config = {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set(),
				chatChannel: null,
				autoRestart: true,
				period: null,
				locale: 'America/Vancouver',
			};
			expect(serializeConfig(config)).toHaveProperty('locale', 'America/Vancouver');
		});
	});
});

describe("getConfigEmbedFields", () => {
	it("returns objects with names and values", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
			autoRestart: false,
			period: null,
			locale: 'UTC',
		});
		for (const obj of result) {
			expect(obj).toHaveProperty('name');
			expect(obj).toHaveProperty('value');
		}
	});

	it("says there is no time limit if there is not", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
			autoRestart: false,
			period: null,
			locale: 'UTC',
		});
		const field = result.find((field) => /time limit/i.test(field.name));
		expect(field).not.toBeUndefined();
		expect(field.value).toStrictEqual(expect.stringMatching(/none/i));
	});

	it("gives the time limit in minutes", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: 1e3 * 60 * 60,
			tagJudgeRoles: new Set(),
			chatChannel: null,
			autoRestart: false,
			period: null,
			locale: 'UTC',
		});
		const field = result.find((field) => /time limit/i.test(field.name));
		expect(field).not.toBeUndefined();
		expect(field.value).toStrictEqual(expect.stringMatching(/\b60\b/));
	});

	it("says there are no judge roles if there are not", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
			autoRestart: false,
			period: null,
			locale: 'UTC',
		});
		const field = result.find((field) => /judge/i.test(field.name));
		expect(field).not.toBeUndefined();
		expect(field.value).toStrictEqual(expect.stringMatching(/none/i));
	});

	it("gives the judge roles if some are set", () => {
		const guild = getGuild();
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set([getRole(guild, 'role1'), getRole(guild, 'role2')]),
			chatChannel: null,
			autoRestart: false,
			period: null,
			locale: 'UTC',
		});
		const field = result.find((field) => /judge/i.test(field.name));
		expect(field).not.toBeUndefined();
		expect(field.value).toStrictEqual(expect.stringContaining("<@&role1>"));
		expect(field.value).toStrictEqual(expect.stringContaining("<@&role2>"));
	});

	it("says there is no chat channel if there is not", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
			autoRestart: false,
			period: null,
			locale: 'UTC',
		});
		const field = result.find((field) => /chat channel/i.test(field.name));
		expect(field).not.toBeUndefined();
		expect(field.value).toStrictEqual(expect.stringMatching(/none/i));
	});

	it("gives the chat channel if one is set", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: getTextChannel(getGuild(), "channel-1"),
			autoRestart: false,
			period: null,
			locale: 'UTC',
		});
		const field = result.find((field) => /chat channel/i.test(field.name));
		expect(field).not.toBeUndefined();
		expect(field.value).toStrictEqual(expect.stringContaining("<#channel-1>"));
	});

	it("says the game is on a manual timeline if that is the case", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
			autoRestart: false,
			period: null,
			locale: 'UTC',
		});
		const field = result.find((field) => /game lifespan/i.test(field.name));
		expect(field).not.toBeUndefined();
		expect(field.value).toStrictEqual(expect.stringMatching(/manual/i));
	});

	it("mentions the period on which the game is running and negative auto-restart status (month)", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
			autoRestart: false,
			period: 'month',
			locale: 'UTC',
		});
		const field = result.find((field) => /game lifespan/i.test(field.name));
		expect(field).not.toBeUndefined();
		expect(field.value).toStrictEqual(expect.stringMatching(/stops at the end of the month/i));
	});

	it("mentions the period on which the game is running and positive auto-restart status (month)", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
			autoRestart: true,
			period: 'month',
			locale: 'UTC',
		});
		const field = result.find((field) => /game lifespan/i.test(field.name));
		expect(field).not.toBeUndefined();
		expect(field.value).toStrictEqual(expect.stringMatching(/restarts at the end of the month/i));
	});

	it("mentions the period on which the game is running and negative auto-restart status (hour)", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
			autoRestart: false,
			period: 'hour',
			locale: 'UTC',
		});
		const field = result.find((field) => /game lifespan/i.test(field.name));
		expect(field).not.toBeUndefined();
		expect(field.value).toStrictEqual(expect.stringMatching(/stops at the end of the hour/i));
	});

	it("mentions the period on which the game is running and positive auto-restart status (hour)", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
			autoRestart: true,
			period: 'hour',
			locale: 'UTC',
		});
		const field = result.find((field) => /game lifespan/i.test(field.name));
		expect(field).not.toBeUndefined();
		expect(field.value).toStrictEqual(expect.stringMatching(/restarts at the end of the hour/i));
	});

	it("shows the configured locale", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
			autoRestart: true,
			period: 'month',
			locale: 'America/Vancouver',
		});
		const field = result.find((field) => /locale/i.test(field.name));
		expect(field).not.toBeUndefined();
		expect(field.value).toStrictEqual(expect.stringContaining('America/Vancouver'));
	});

	it("doesn't show a locale if on a manual schedule", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
			autoRestart: true,
			period: null,
			locale: 'America/Vancouver',
		});
		const field = result.find((field) => /locale/i.test(field.name));
		expect(field).toBeUndefined();
	});
});
