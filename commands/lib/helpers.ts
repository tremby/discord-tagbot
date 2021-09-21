import type { CommandInteraction, TextChannel } from 'discord.js';
import { Permissions } from 'discord.js';

import { BotError } from '../../lib/bot-error';
import { channelIsTextChannel, getGameOfChannel } from '../../lib/channel';
import { isGuildMemberRoleManager } from '../../lib/user';

export class ProblemCheckingPermissionsError extends BotError {};
export class NoTextChannelError extends BotError {};

/**
 * Require admin for a particular interaction.
 *
 * @param {CommandInteraction} interaction - The interaction taking place.
 * @returns {boolean} True if the user is an admin.
 * @throws {ProblemCheckingPermissionsError}
 */
export function isAdmin(interaction: CommandInteraction): boolean {
	// FIXME: Issue with types? Docs say GuildMember.permissions is a
	// ReadOnly<Permissions> but the types currently say it could also
	// be a string.
	if (typeof interaction.member.permissions === 'string') {
		// Haven't yet seen this come back as a string
		throw new ProblemCheckingPermissionsError(`Came across a GuildMember whose permissions property is a string; expected a ReadOnly<Permissions>. Value: "${interaction.member.permissions}"`);
	}

	return interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR);
}

/**
 * Require admin or tag judge.
 *
 * @param {CommandInteraction} interaction - The interaction taking place.
 * @param {Game} game - The game associated with the interaction.
 * @returns {boolean} True if the user is either an admin or a tag judge for this game.
 * @throws {ProblemCheckingPermissionsError}
 */
export function isAdminOrTagJudge(interaction: CommandInteraction, game: Game): boolean {
	// If the user is an admin we're done
	if (isAdmin(interaction)) return true;

	// Allow tag judges
	const memberRoles = interaction.member.roles;
	if (!isGuildMemberRoleManager(memberRoles)) {
		// FIXME: handle this? Haven't yet seen this trip
		throw new ProblemCheckingPermissionsError(`Expected a role manager; got an array: ${JSON.stringify(memberRoles)}`);
	}
	return [...game.config.tagJudgeRoles].some((judgeRole) => memberRoles.cache.has(judgeRole.id));
}

/**
 * Get the associated channel for a particular interaction, whether from an
 * option given with the command or optionally falling back to the channel the
 * interaction was initiated in.
 *
 * If there's no such channel, or it's not a text channel, throw an error.
 *
 * @param {CommandInteraction} interaction - The interaction taking place.
 * @param {string} [optionName] - Name of the option from which to take the channel.
 * @param {boolean} [fallback] - True if we should fall back to the current channel.
 * @returns {Channel} The channel associated with the interaction.
 * @throws {NoTextChannelError}
 */
export function getValidChannel(interaction: CommandInteraction, optionName: string = 'game-channel', fallback: boolean = true): TextChannel {
	const channel = interaction.options.getChannel(optionName) ?? (fallback ? interaction.channel : null);

	if (channel == null) {
		throw new NoTextChannelError(`A channel was required for ${optionName}`);
	}

	if (("deleted" in channel) && channel.deleted) {
		throw new NoTextChannelError("This only works on channels which have not been deleted.");
	}

	if (!channelIsTextChannel(channel)) {
		throw new NoTextChannelError("This only works on text channels.");
	}

	return channel;
}
