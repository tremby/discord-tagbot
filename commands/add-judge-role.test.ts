import commandSpec from './add-judge-role';
import { getCommandInteraction, getTextChannel, getGuild, getUser, getRole } from '../test/fixtures';
import { expectInteractionResponse } from '../test/util';
import { Constants } from 'discord.js';
import type { ApplicationCommandInteractionDataOptionRole } from 'discord-api-types';

import { mocked } from 'ts-jest/utils';

jest.mock('../lib/state');
import gameState, { persistToDisk } from '../lib/state';
const mockPersistToDisk = mocked(persistToDisk);

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

describe("add-judge-role command", () => {
	beforeEach(() => {
		mockIsRole.mockReturnValue(true);
	});

	it("responds with an error, emits a console error, and does nothing else if given something which isn't a role", async () => {
		const mockError = jest.spyOn(console, 'error').mockImplementation();
		mockIsRole.mockReturnValue(false);
		const game = {
			config: {
				tagJudgeRoles: new Set([role1]),
			},
		} as Game;
		const interaction = getCommandInteraction(channel, user1, 'add-judge-role', [], {});
		await commandSpec.handler(interaction, channel, { config: { tagJudgeRoles: new Set() } } as Game);
		expectInteractionResponse(interaction, true);
		expect(mockError).toHaveBeenCalledTimes(1);
		expect(mockPersistToDisk).not.toHaveBeenCalled();
		expect(game.config.tagJudgeRoles.size).toBe(1);
	});

	it("responds with an error and does nothing else if the role is already assigned", async () => {
		const game = {
			config: { tagJudgeRoles: new Set([role1]) },
		} as Game;
		const options = [{
			name: 'role',
			type: Constants.ApplicationCommandOptionTypes.ROLE as number, // FIXME: broken types?
			value: role1.id,
		} as ApplicationCommandInteractionDataOptionRole];
		const interaction = getCommandInteraction(channel, user1, 'add-judge-role', options, {
			roles: { [role1.id]: role1 },
		});
		await commandSpec.handler(interaction, channel, game);
		expectInteractionResponse(interaction, true);
		expect(mockPersistToDisk).not.toHaveBeenCalled();
		expect(game.config.tagJudgeRoles.size).toBe(1);
	});

	it("persists to disk", async () => {
		const game = {
			config: { tagJudgeRoles: new Set() },
		} as Game;
		const options = [{
			name: 'role',
			type: Constants.ApplicationCommandOptionTypes.ROLE as number, // FIXME: broken types?
			value: role1.id,
		} as ApplicationCommandInteractionDataOptionRole];
		const interaction = getCommandInteraction(channel, user1, 'add-judge-role', options, {
			roles: { [role1.id]: role1 },
		});
		await commandSpec.handler(interaction, channel, game);
		expect(mockPersistToDisk).toHaveBeenCalledTimes(1);
	});

	it("registers the role", async () => {
		const game = {
			config: { tagJudgeRoles: new Set() },
		} as Game;
		const options = [{
			name: 'role',
			type: Constants.ApplicationCommandOptionTypes.ROLE as number, // FIXME: broken types?
			value: role1.id,
		} as ApplicationCommandInteractionDataOptionRole];
		const interaction = getCommandInteraction(channel, user1, 'add-judge-role', options, {
			roles: { [role1.id]: role1 },
		});
		await commandSpec.handler(interaction, channel, game);
		expect(game.config.tagJudgeRoles.size).toBe(1);
	});

	it("replies to the user on success", async () => {
		const game = {
			config: { tagJudgeRoles: new Set() },
		} as Game;
		const options = [{
			name: 'role',
			type: Constants.ApplicationCommandOptionTypes.ROLE as number, // FIXME: broken types?
			value: role1.id,
		} as ApplicationCommandInteractionDataOptionRole];
		const interaction = getCommandInteraction(channel, user1, 'add-judge-role', options, {
			roles: { [role1.id]: role1 },
		});
		await commandSpec.handler(interaction, channel, game);
		expectInteractionResponse(interaction, true);
	});
});
