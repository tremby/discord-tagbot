import * as m from './helpers';
import type { Role, GuildMemberRoleManager, ChatInputApplicationCommandData } from 'discord.js';
import { ChatInputCommandInteraction, PermissionsBitField, Constants, Collection } from 'discord.js';
import { BotError } from "../../lib/bot-error";
import { getClient, getGuild, getTextChannel, getUser, getMember, getRole } from '../../test/fixtures';

import { mocked } from 'jest-mock';

jest.mock('../../lib/user');
import { isGuildMemberRoleManager } from '../../lib/user';
const mockIsGuildMemberRoleManager = mocked(isGuildMemberRoleManager);

jest.mock('../../lib/channel');
import { channelIsTextChannel } from '../../lib/channel';
const mockChannelIsTextChannel = mocked(channelIsTextChannel);

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user-1');
const role1 = getRole(guild, 'role-1');
const role2 = getRole(guild, 'role-2');
const tagJudgeRole1 = getRole(guild, 'judge-role-1');
const tagJudgeRole2 = getRole(guild, 'judge-role-2');

describe("ProblemCheckingPermissionsError", () => {
	it("is a subclass of BotError", () => {
		const e = new m.ProblemCheckingPermissionsError("message");
		expect(e).toBeInstanceOf(BotError);
	});

	it("retains its message", () => {
		const e = new m.ProblemCheckingPermissionsError("message");
		expect(e.message).toBe("message");
	});
});

describe("NoTextChannelError", () => {
	it("is a subclass of BotError", () => {
		const e = new m.NoTextChannelError("message");
		expect(e).toBeInstanceOf(BotError);
	});

	it("retains its message", () => {
		const e = new m.NoTextChannelError("message");
		expect(e.message).toBe("message");
	});
});

describe("isAdmin", () => {
	it("throws an error if the permissions property is not the expected type", () => {
		expect(() => {
			m.isAdmin({ member: { permissions: "some string" } } as ChatInputCommandInteraction);
		}).toThrowError(expect.any(m.ProblemCheckingPermissionsError));
	});

	it("returns true if the user has the administrator flag", () => {
		expect(m.isAdmin({
			member: {
				permissions: new PermissionsBitField(PermissionsBitField.Flags.Administrator),
			},
		} as ChatInputCommandInteraction)).toBe(true);
	});

	it("returns true if the user has the administrator flag among others", () => {
		expect(m.isAdmin({
			member: {
				permissions: new PermissionsBitField(PermissionsBitField.Flags.Administrator | PermissionsBitField.Flags.Connect),
			},
		} as ChatInputCommandInteraction)).toBe(true);
	});

	it("returns false if the user does not have the administrator flag", () => {
		expect(m.isAdmin({
			member: {
				permissions: new PermissionsBitField(PermissionsBitField.Flags.Speak | PermissionsBitField.Flags.Connect),
			},
		} as ChatInputCommandInteraction)).toBe(false);
	});
});

describe("isAdminOrTagJudge", () => {
	const game = {
		channel,
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
			status: 'free',
			scores: new Map(),
		},
	} as Game;

	it("first calls isAdmin and returns immediately if true", () => {
		const mockIsAdmin = jest.spyOn(m, 'isAdmin').mockReturnValue(true);
		expect(m.isAdminOrTagJudge({} as ChatInputCommandInteraction, game)).toBe(true);
		expect(mockIsGuildMemberRoleManager).not.toHaveBeenCalled();
	});

	it("throws an error if the roles object is not a guild member role manager", () => {
		const mockIsAdmin = jest.spyOn(m, 'isAdmin').mockReturnValue(false);
		mockIsGuildMemberRoleManager.mockReturnValue(false);
		expect(() => {
			m.isAdminOrTagJudge({ member: { roles: true } } as unknown as ChatInputCommandInteraction, game);
		}).toThrow(expect.any(m.ProblemCheckingPermissionsError));
	});

	it("returns false if the user is not an admin and there are no judge roles", () => {
		const mockIsAdmin = jest.spyOn(m, 'isAdmin').mockReturnValue(false);
		mockIsGuildMemberRoleManager.mockReturnValue(true);
		expect(m.isAdminOrTagJudge({ member: { roles: true } } as unknown as ChatInputCommandInteraction, game)).toBe(false);
	});

	it("returns false if the user does not have any of the judge roles", () => {
		const mockIsAdmin = jest.spyOn(m, 'isAdmin').mockReturnValue(false);
		mockIsGuildMemberRoleManager.mockReturnValue(true);
		const member = getMember(guild, user1, [role1, role2]);
		const mockRoleManager = jest.spyOn(member, 'roles', 'get').mockReturnValue({
			cache: new Set([role1.id, role2.id]),
		} as unknown as GuildMemberRoleManager);
		expect(m.isAdminOrTagJudge({ member } as ChatInputCommandInteraction, {
		channel,
			config: {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set([tagJudgeRole1, tagJudgeRole2]),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
				rankingStrategy: 'standardCompetition',
			},
			statusMessage: null,
			state: {
				status: 'free',
				scores: new Map(),
			},
		})).toBe(false);
	});

	it("returns true if the user does any of the judge roles", () => {
		const mockIsAdmin = jest.spyOn(m, 'isAdmin').mockReturnValue(false);
		mockIsGuildMemberRoleManager.mockReturnValue(true);
		const member = getMember(guild, user1, [role1, role2, tagJudgeRole1]);
		const mockRoleManager = jest.spyOn(member, 'roles', 'get').mockReturnValue({
			cache: new Set([role1.id, role2.id, tagJudgeRole1.id]),
		} as unknown as GuildMemberRoleManager);
		expect(m.isAdminOrTagJudge({ member } as ChatInputCommandInteraction, {
		channel,
			config: {
				nextTagTimeLimit: null,
				tagJudgeRoles: new Set([tagJudgeRole1, tagJudgeRole2]),
				chatChannel: null,
				autoRestart: false,
				period: null,
				locale: 'UTC',
				rankingStrategy: 'standardCompetition',
			},
			statusMessage: null,
			state: {
				status: 'free',
				scores: new Map(),
			},
		})).toBe(true);
	});
});

describe("getValidChannel", () => {
	// @ts-expect-error -- private constructor
	const interaction = new ChatInputCommandInteraction(getClient(), {
		id: '',
		application_id: '',
		type: 2,
		token: '',
		version: 1,
		message: null,
		channel_id: channel.id,
		data: {
			id: '',
			name: '',
		},
		user: {
			id: user1.id,
			username: user1.username,
			avatar: user1.avatar,
			discriminator: user1.discriminator,
		},
		entitlements: [],
	});

	describe("with a given option name", () => {
		it("throws an error if no channel was passed", () => {
			expect(() => {
				m.getValidChannel(interaction, 'channel');
			}).toThrow(expect.any(m.NoTextChannelError));
		});

		it("throws an error if the channel is not a text channel", () => {
			jest.spyOn(interaction.options, 'getChannel').mockReturnValue(channel);
			mockChannelIsTextChannel.mockReturnValue(false);
			expect(() => {
				m.getValidChannel(interaction, 'channel');
			}).toThrow(expect.any(m.NoTextChannelError));
		});

		it("looks for the channel via the given option name", () => {
			mockChannelIsTextChannel.mockReturnValue(true);
			const mockGetChannel = jest.spyOn(interaction.options, 'getChannel').mockReturnValue(channel);
			m.getValidChannel(interaction, 'test');
			expect(mockGetChannel).toHaveBeenCalledTimes(1);
			expect(mockGetChannel).toHaveBeenCalledWith('test');
		});

		it("returns the specified channel", () => {
			jest.spyOn(interaction.options, 'getChannel').mockReturnValue(channel);
			mockChannelIsTextChannel.mockReturnValue(true);
			expect(m.getValidChannel(interaction, 'channel')).toBe(channel);
		});
	});

	describe("when using the interaction's own channel", () => {
		it("throws an error if the channel is not a text channel", () => {
			jest.spyOn(interaction, 'channel', 'get').mockReturnValue(channel);
			mockChannelIsTextChannel.mockReturnValue(false);
			expect(() => {
				m.getValidChannel(interaction);
			}).toThrow(expect.any(m.NoTextChannelError));
		});

		it("doesn't look for a channel by name", () => {
			jest.spyOn(interaction, 'channel', 'get').mockReturnValue(channel);
			mockChannelIsTextChannel.mockReturnValue(true);
			const mockGetChannel = jest.spyOn(interaction.options, 'getChannel').mockReturnValue(channel);
			m.getValidChannel(interaction);
			expect(mockGetChannel).not.toHaveBeenCalled();
		});

		it("returns the channel the interaction took place in", () => {
			jest.spyOn(interaction, 'channel', 'get').mockReturnValue(channel);
			mockChannelIsTextChannel.mockReturnValue(true);
			expect(m.getValidChannel(interaction)).toBe(channel);
		});
	});
});
