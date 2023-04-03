import type { Message, PartialMessage, User, Attachment } from 'discord.js';

import appState from './state';
import { channelIsTextChannel, getGameOfChannel } from './channel';

/**
 * Determine whether an attachment is pertinent.
 *
 * It's deemed pertinent if it's an image or video.
 */
function attachmentIsPertinent(attachment: Attachment): boolean {
	return (attachment.contentType?.startsWith('image/') || attachment.contentType?.startsWith('video/')) ?? false;
}

/**
 * Determine whether a message has an image.
 *
 * Videos are also accepted.
 */
export function messageHasImage(message: Message | PartialMessage): boolean {
	return message.attachments.some(attachmentIsPertinent);
}

/**
 * Get pertinent attachments from a message.
 */
export function getMessageImages(message: Message | PartialMessage): Attachment[] {
	return [...message.attachments.filter(attachmentIsPertinent).values()];
}

/**
 * Get all users associated with a message.
 *
 * That is, the user who posted it, plus anyone mentioned.
 */
export function getMessageUsers(message: Message | PartialMessage): Set<User> {
	return new Set<User>([message.author!, ...message.mentions.users.values()]);
}

/**
 * Delete a message and remember that we have done so.
 */
export async function deleteMessage(message: Message): Promise<void> {
	appState.deletedMessageIds.add(message.id);
	await message.delete();
}
