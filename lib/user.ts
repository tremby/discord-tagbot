import type { GuildMemberRoleManager } from 'discord.js';

/**
 * Discriminate between GuildMemberRoleManager and array of strings.
 */
export function isGuildMemberRoleManager(obj: object): obj is GuildMemberRoleManager {
	if (Array.isArray(obj)) return false;
	return 'holds' in obj;
}
