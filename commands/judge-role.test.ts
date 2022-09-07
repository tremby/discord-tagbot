import commandSpec from './judge-role';
import { getCommandInteraction, getTextChannel, getGuild, getUser, getRole } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import type { APIApplicationCommandInteractionDataOption } from 'discord-api-types/v10';

import { mocked } from 'jest-mock';

jest.mock('../lib/state');
import gameState, { persist } from '../lib/state';
const mockPersist = mocked(persist);

jest.mock('../lib/role');
import { isRole } from '../lib/role';
const mockIsRole = mocked(isRole);

jest.mock('../lib/config');
import { getConfigEmbedFields } from '../lib/config';
const mockGetConfigEmbedFields = mocked(getConfigEmbedFields);

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user1');
const role1 = getRole(guild, 'role1');
const role2 = getRole(guild, 'role2');

describe("judge-role command", () => {
	beforeEach(() => {
		mockIsRole.mockReturnValue(true);
	});

	describe("add subcommand", () => {
		it("responds with an error, emits a console error, and does nothing else if given no role or something which isn't a role", async () => {
			const mockError = jest.spyOn(console, 'error').mockImplementation();
			mockIsRole.mockReturnValue(false);
			const game = {
				config: {
					tagJudgeRoles: new Set([role1]),
				},
			} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'add',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'judge-role', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
			expect(mockError).toHaveBeenCalledTimes(1);
			expect(mockPersist).not.toHaveBeenCalled();
			expect(game.config.tagJudgeRoles.size).toBe(1);
		});

		it("responds with an error and does nothing else if the role is already assigned", async () => {
			const game = {
				config: { tagJudgeRoles: new Set([role1]) },
			} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'add',
					options: [
						{
							name: 'role',
							type: ApplicationCommandOptionType.Role,
							value: role1.id,
						}
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'judge-role', options, {
				roles: { [role1.id]: role1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
			expect(mockPersist).not.toHaveBeenCalled();
			expect(game.config.tagJudgeRoles.size).toBe(1);
		});

		it("persists to disk", async () => {
			const game = {
				config: { tagJudgeRoles: new Set() },
			} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'add',
					options: [
						{
							name: 'role',
							type: ApplicationCommandOptionType.Role,
							value: role1.id,
						}
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'judge-role', options, {
				roles: { [role1.id]: role1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expect(mockPersist).toHaveBeenCalledTimes(1);
		});

		it("registers the role", async () => {
			const game = {
				config: { tagJudgeRoles: new Set() },
			} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'add',
					options: [
						{
							name: 'role',
							type: ApplicationCommandOptionType.Role,
							value: role1.id,
						}
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'judge-role', options, {
				roles: { [role1.id]: role1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expect(game.config.tagJudgeRoles.size).toBe(1);
		});

		it("replies to the user on success", async () => {
			const game = {
				config: { tagJudgeRoles: new Set() },
			} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'add',
					options: [
						{
							name: 'role',
							type: ApplicationCommandOptionType.Role,
							value: role1.id,
						}
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'judge-role', options, {
				roles: { [role1.id]: role1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});
	});

	describe("remove subcommand", () => {
		it("responds with an error, emits a console error, and does nothing else if given no role or something which isn't a role", async () => {
			const mockError = jest.spyOn(console, 'error').mockImplementation();
			mockIsRole.mockReturnValue(false);
			const game = {
				config: {
					tagJudgeRoles: new Set([role1]),
				},
			} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'remove',
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'judge-role', options, {});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
			expect(mockError).toHaveBeenCalledTimes(1);
			expect(mockPersist).not.toHaveBeenCalled();
			expect(game.config.tagJudgeRoles.size).toBe(1);
		});

		it("responds with an error and does nothing else if the role is not already assigned", async () => {
			const game = {
				config: { tagJudgeRoles: new Set([role2]) },
			} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'remove',
					options: [
						{
							name: 'role',
							type: ApplicationCommandOptionType.Role,
							value: role1.id,
						}
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'judge-role', options, {
				roles: { [role1.id]: role1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
			expect(mockPersist).not.toHaveBeenCalled();
			expect(game.config.tagJudgeRoles.size).toBe(1);
		});

		it("persists to disk", async () => {
			const game = {
				config: { tagJudgeRoles: new Set([role1]) },
			} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'remove',
					options: [
						{
							name: 'role',
							type: ApplicationCommandOptionType.Role,
							value: role1.id,
						}
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'judge-role', options, {
				roles: { [role1.id]: role1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expect(mockPersist).toHaveBeenCalledTimes(1);
		});

		it("unregisters the role", async () => {
			const game = {
				config: { tagJudgeRoles: new Set([role1]) },
			} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'remove',
					options: [
						{
							name: 'role',
							type: ApplicationCommandOptionType.Role,
							value: role1.id,
						}
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'judge-role', options, {
				roles: { [role1.id]: role1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expect(game.config.tagJudgeRoles.size).toBe(0);
		});

		it("replies to the user on success", async () => {
			const game = {
				config: { tagJudgeRoles: new Set([role1]) },
			} as Game;
			const options = [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: 'remove',
					options: [
						{
							name: 'role',
							type: ApplicationCommandOptionType.Role,
							value: role1.id,
						}
					],
				},
			] as APIApplicationCommandInteractionDataOption[];
			const interaction = getCommandInteraction(channel, user1, 'judge-role', options, {
				roles: { [role1.id]: role1 },
			});
			await commandSpec.handler(interaction, channel, game);
			expectInteractionResponse(interaction, true);
		});
	});
});
