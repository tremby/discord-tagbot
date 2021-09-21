import type { Role } from 'discord.js';

export function isRole(obj: object): obj is Role {
	// These are some things in Role but not in APIRole
	return ('createdAt' in obj) && ('createdTimestamp' in obj) && ('deleted' in obj) && ('editable' in obj);
}
