import * as thisModule from './helpers';

import type { ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { PermissionsBitField } from 'discord.js';

import { BotError } from '../../lib/bot-error';
import { channelIsTextChannel, getGameOfChannel } from '../../lib/channel';
import { isGuildMemberRoleManager } from '../../lib/user';

export class ProblemCheckingPermissionsError extends BotError {};
export class NoTextChannelError extends BotError {};

/**
 * Require admin for a particular interaction.
 *
 * @param {ChatInputCommandInteraction} interaction - The interaction taking place.
 * @returns {boolean} True if the user is an admin.
 * @throws {ProblemCheckingPermissionsError}
 */
export function isAdmin(interaction: ChatInputCommandInteraction): boolean {
	if (interaction.member == null) throw new ProblemCheckingPermissionsError("Couldn't get member from interaction");

	// FIXME: Issue with types? Docs say GuildMember.permissions is a
	// ReadOnly<Permissions> but the types currently say it could also
	// be a string.
	if (typeof interaction.member.permissions === 'string') {
		// Haven't yet seen this come back as a string
		throw new ProblemCheckingPermissionsError(`Came across a GuildMember whose permissions property is a string; expected a ReadOnly<PermissionsBitField>. Value: "${interaction.member.permissions}"`);
	}

	return interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
}

/**
 * Require admin or tag judge.
 *
 * @param {ChatInputCommandInteraction} interaction - The interaction taking place.
 * @param {Game} game - The game associated with the interaction.
 * @returns {boolean} True if the user is either an admin or a tag judge for this game.
 * @throws {ProblemCheckingPermissionsError}
 */
export function isAdminOrTagJudge(interaction: ChatInputCommandInteraction, game: Game): boolean {
	// If the user is an admin we're done
	if (thisModule.isAdmin(interaction)) return true;

	if (interaction.member == null) throw new ProblemCheckingPermissionsError("Couldn't get member from interaction");

	// Allow tag judges
	const memberRoles = interaction.member.roles;
	if (!isGuildMemberRoleManager(memberRoles)) {
		// FIXME: handle this? Haven't yet seen this trip
		throw new ProblemCheckingPermissionsError(`Expected a role manager; got an array: ${JSON.stringify(memberRoles)}`);
	}
	return [...game.config.tagJudgeRoles].some((judgeRole) => memberRoles.cache.has(judgeRole.id));
}

/**
 * Get a valid channel associated with a particular interaction,
 * whether from an option given with the command
 * or the channel the interaction was initiated in.
 *
 * If there's no such channel, or it's not a text channel, throw an error.
 *
 * @param {ChatInputCommandInteraction} interaction - The interaction taking place.
 * @param {?string} [optionName] - Name of the option from which to take the channel. If not given, use the channel the interaction took place in.
 * @returns {Channel} The channel associated with the interaction.
 * @throws {NoTextChannelError}
 */
export function getValidChannel(interaction: ChatInputCommandInteraction, optionName?: string): TextChannel {
	const channel = optionName ? interaction.options.getChannel(optionName) : interaction.channel;

	if (optionName && channel == null) {
		throw new NoTextChannelError(`A channel was required for ${optionName}`);
	}

	if (!channelIsTextChannel(channel)) {
		throw new NoTextChannelError("This only works on text channels.");
	}

	return channel;
}
