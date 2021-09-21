import type { Message, PartialMessage, User } from 'discord.js';

import appState from './state';
import { channelIsTextChannel, getGameOfChannel } from './channel';

/**
 * Determine whether a message has an image.
 *
 * Videos are also accepted.
 */
export function messageHasImage(message: Message | PartialMessage): boolean {
	return message.attachments.some((attachment) => attachment.contentType.startsWith('image/') || attachment.contentType.startsWith('video/'));
}

/**
 * Get all users associated with a message.
 *
 * That is, the user who posted it, plus anyone mentioned.
 */
export function getMessageUsers(message: Message): Set<User> {
	const users = new Set<User>([message.author]);
	for (const [username, user] of message.mentions.users) {
		users.add(user);
	}
	return users;
}

/**
 * Delete a message and remember that we have done so.
 */
export async function deleteMessage(message: Message): Promise<void> {
	appState.deletedMessageIds.add(message.id);
	await message.delete();
}
