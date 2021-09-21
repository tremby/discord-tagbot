import type { Collection, User, Message, TextChannel } from 'discord.js';

import appState from '../lib/state';

import { DISCORD_FETCH_MESSAGES_MAX } from './constants';

export function channelIsTextChannel(channel: object): channel is TextChannel {
	return ('type' in channel) && (channel as TextChannel).type === 'GUILD_TEXT';
}

/**
 * Get the game running in a given channel.
 */
export function getGameOfChannel(channel: TextChannel): Game | null {
	for (const game of appState.games) {
		if (game.channel === channel) return game;
	}
	return null;
}

/**
 * Get all messages in the channel in chronological order.
 *
 * @param {TextChannel} channel
 * @param {boolean} force - Force a cache skip. Default is false.
 */
export async function getAllMessages(channel: TextChannel, force: boolean = false): Promise<Message[]> {
	let justFetched: Collection<string, Message> = null;
	let allMessages: Message[] = [];

	// Messages come in reverse-chronological order,
	// so to get more messages we need to make the next page query for messages
	// "before" (chronologically) the "last" (retrieved, i.e. chronologically earliest)
	// message just retrieved.

	while (true) {
		console.log("Fetching a page of messages");

		// Fetch a page of results
		justFetched = await channel.messages.fetch({
			limit: DISCORD_FETCH_MESSAGES_MAX,
			before: justFetched == null ? undefined : justFetched.last().id,
		}, { force });

		// Concatenate to our list of all messages
		allMessages.push(...justFetched.values());

		// If we have less than the number we asked for, that's the end
		// (or the maximum page size has changed)
		if (justFetched.size < DISCORD_FETCH_MESSAGES_MAX) {
			// That's the last of them
			break;
		}
	}

	// Reverse to be in chronological order
	allMessages = allMessages.reverse();

	return allMessages;
};

/**
 * Determine whether a message is the bot's game status message.
 *
 * This is naïve -- it only checks it was posted by the bot user and is pinned.
 */
function isStatusMessage(botUser: User, message: Message): boolean {
	return message.pinned && message.author === botUser;
}

/**
 * Find the bot's tag game status message in a channel.
 *
 * It is expected to be found in the pinned messages.
 */
export async function getStatusMessage(channel: TextChannel): Promise<Message | null> {
	// Find in the pinned messages
	for (const message of (await channel.messages.fetchPinned()).values()) {
		if (isStatusMessage(channel.client.user, message)) return message;
	}

	// Not found
	return null;
}
