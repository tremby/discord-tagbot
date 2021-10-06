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
});

describe('serializeConfig', () => {
	describe("next tag time limit", () => {
		it("keeps null as null", () => {
			const config: Config = {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set(),
				chatChannel: null,
			};
			expect(serializeConfig(config)).toHaveProperty('nextTagTimeLimit', null);
		});

		it("doesn't mess with a number", () => {
			const config: Config = {
				nextTagTimeLimit: 42,
				tagJudgeRoles: new Set(),
				chatChannel: null,
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
			};
			expect(serializeConfig(config)).toHaveProperty('chatChannelId', null);
		});

		it("converts to ID", () => {
			const config: Config = {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set(),
				chatChannel: getTextChannel(getGuild(), "channel-1"),
			};
			expect(serializeConfig(config)).toHaveProperty('chatChannelId', 'channel-1');
		});
	});
});

describe("getConfigEmbedFields", () => {
	it("returns objects with names and values", () => {
		const result = getConfigEmbedFields({
			nextTagTimeLimit: null,
			tagJudgeRoles: new Set(),
			chatChannel: null,
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
		});
		const field = result.find((field) => /chat channel/i.test(field.name));
		expect(field).not.toBeUndefined();
		expect(field.value).toStrictEqual(expect.stringContaining("<#channel-1>"));
	});
});
