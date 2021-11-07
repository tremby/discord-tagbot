import * as thisModule from './state';

import type { Client, TextChannel } from 'discord.js';
import { writeFile, readFile } from 'fs/promises';

import { serializeConfig } from './config';
import { getStatusMessage } from './channel';
import { recount } from './scoring';
import { setTimers } from './timers';
import { gameStateIsAwaitingNext, gameStateIsAwaitingMatch } from './game-state';

const STATE_FILE = 'state.json';

const state = {
	/**
	 * The currently-tracked games.
	 */
	games: new Set<Game>(),

	/**
	 * Messages deleted by us;
	 * we want to ignore these when they're brought up in "message deletion" events.
	 */
	deletedMessageIds: new Set<string>(),
};

export default state;

/**
 * Serialize game object to something which can be persisted.
 */
export function serializeGame(game: Game): SerializedGame {
	const serialized = {
		channelId: game.channel.id,
		status: game.state.status,
		config: serializeConfig(game.config),
	} as SerializedGame;

	if (gameStateIsAwaitingNext(game.state) || gameStateIsAwaitingMatch(game.state)) {
		serialized.excludedFromRound = [...game.state.excludedFromRound].map((user) => user.id);
	}

	return serialized;
}

/**
 * Persist state to disk.
 */
export async function persistToDisk(): Promise<void> {
	await writeFile(STATE_FILE, JSON.stringify({
		games: [...state.games].map((game) => thisModule.serializeGame(game)),
	}, null, 2));
}

/**
 * Load state from disk.
 */
export async function loadFromDisk(client: Client): Promise<void> {
	console.log("Loading from disk");

	const str = await readFile(STATE_FILE, { encoding: 'utf-8' });
	const data = JSON.parse(str);

	state.games = new Set(await Promise.all(data.games.map(async (serializedGame: SerializedGame) => {
		// Get the channel object
		const channel = await client.channels.fetch(serializedGame.channelId) as TextChannel;

		// Recover the game configuration
		const config: Config = {
			nextTagTimeLimit: serializedGame.config.nextTagTimeLimit,
			tagJudgeRoles: new Set(await Promise.all(serializedGame.config.tagJudgeRoleIds.map(async (id) => channel.guild.roles.fetch(id)))),
			chatChannel: serializedGame.config.chatChannelId ? await client.channels.fetch(serializedGame.config.chatChannelId) as TextChannel : null,
		};

		// Find the status message
		const statusMessage = await getStatusMessage(channel);

		// Set up a partial game state object
		const partialGame = {
			channel,
			config,
			statusMessage,
		};

		// Get current state: if not archived that means doing a recount
		const state: GameState = serializedGame.status === 'archived' ? { status: 'archived' } : await recount(partialGame);

		// If necessary, get currently-banned users
		if (gameStateIsAwaitingMatch(state) || gameStateIsAwaitingNext(state)) {
			state.excludedFromRound = new Set(await Promise.all(serializedGame.excludedFromRound.map((id) => client.users.fetch(id))));
		}

		// Put together the final game object
		const game: Game = {
			channel,
			config,
			state,
			statusMessage,
		};

		// Start timers if necessary
		setTimers(game, state);

		return game;
	})));

	console.log("Finished loading from disk");
}
