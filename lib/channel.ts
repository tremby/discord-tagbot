import type { Collection, User, Message, TextChannel } from 'discord.js';

import appState from '../lib/state';

/**
 * Maximum number of messages we can fetch at a time.
 *
 * https://discord.com/developers/docs/resources/channel#get-channel-messages
 */
const DISCORD_FETCH_MESSAGES_MAX = 100;

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
 * Get an iterator for all messages in the channel in chronological order.
 *
 * @param {TextChannel} channel
 * @param {boolean} force - Force a cache skip. Default is false.
 */
export async function* getAllMessages(channel: TextChannel, force: boolean = false): AsyncGenerator<Message> {
	let justFetched: Collection<string, Message> = null;
	const allMessages: Message[] = [];

	while (true) {
		console.log("Fetching a page of messages");

		// Fetch a page of results
		// Note that even with `after` they come in reverse chronological order
		// so we need to fetch items "after" (chronologically) the "first"
		// of the just-received batch (which is the chronologically last).
		// The ID being given here, "0", is used as a timestamp. It works
		// (and is acceptable as per the documentation)
		// because these "snowflake" IDs are based on timestamps
		// with extra information afterwards,
		// i.e. there cannot be any before zero.
		justFetched = await channel.messages.fetch({
			limit: DISCORD_FETCH_MESSAGES_MAX,
			after: justFetched == null ? "0" : justFetched.first().id,
		}, { force });

		// Yield the messages in chronological order
		for (const message of [...justFetched.values()].reverse()) {
			yield message;
		}

		// If we just fetched less than the number we asked for,
		// that's the end (or Discord has decreased its maximum page size)
		if (justFetched.size < DISCORD_FETCH_MESSAGES_MAX) {
			break;
		}
	}
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
