import * as thisModule from './state';

import type { Role, Client, TextChannel } from 'discord.js';

import { createClient as createRedisClient, type RedisClientType } from 'redis';

import { serializeConfig } from './config';
import { recount } from './scoring';
import { setTimers } from './timers';
import { gameStateIsAwaitingNext, gameStateIsAwaitingMatch, updateGameStatusMessage } from './game-state';

const STATE_KEY = 'state';

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

// Set up Redis client
const redisClient = createRedisClient({
	url: `redis://${process.env.REDISUSER ?? ''}:${process.env.REDISPASSWORD ?? ''}@${process.env.REDISHOST ?? 'localhost'}:${process.env.REDISPORT ?? '6379'}`,
}) as RedisClientType;
redisClient.on('error', (error) => console.log("Redis error", error));

/**
 * Get the Redis client
 */
export function getRedisClient(): RedisClientType {
	return redisClient;
}

/**
 * Serialize game object to something which can be persisted.
 */
export function serializeGame(game: Game): SerializedGame {
	const serialized = {
		channelId: game.channel.id,
		status: game.state.status,
		config: serializeConfig(game.config),
		statusMessageId: game.statusMessage?.id ?? null,
	} as SerializedGame;

	if (gameStateIsAwaitingNext(game.state) || gameStateIsAwaitingMatch(game.state)) {
		serialized.disqualifiedFromRound = [...game.state.disqualifiedFromRound].map((user) => user.id);
	}

	return serialized;
}

/**
 * Persist state.
 */
export async function persist(): Promise<void> {
	await thisModule.getRedisClient().set(STATE_KEY, JSON.stringify({
		games: [...state.games].map((game) => thisModule.serializeGame(game)),
	}, null, 2));
}

/**
 * Load state.
 */
export async function load(discordClient: Client): Promise<void> {
	console.log("Loading state from storage");

	const str = await thisModule.getRedisClient().get(STATE_KEY);

	if (str == null) {
		console.log("No state found");
		return;
	}

	const data = JSON.parse(str);

	state.games = new Set(await Promise.all(data.games.map(async (serializedGame: SerializedGame) => {
		// Get the channel object
		const channel = await discordClient.channels.fetch(serializedGame.channelId) as TextChannel;

		// Recover the game configuration
		const config: Config = {
			nextTagTimeLimit: serializedGame.config.nextTagTimeLimit,
			tagJudgeRoles: new Set(
				(await Promise.all(serializedGame.config.tagJudgeRoleIds.map(async (id) => channel.guild.roles.fetch(id))))
					.filter((r): r is Role => r != null)
			),
			chatChannel: serializedGame.config.chatChannelId ? await discordClient.channels.fetch(serializedGame.config.chatChannelId) as TextChannel : null,
			autoRestart: serializedGame.config.autoRestart,
			period: serializedGame.config.period,
			locale: serializedGame.config.locale,
			rankingStrategy: serializedGame.config.rankingStrategy ?? 'standardCompetition',
		};

		// Find the status message
		const statusMessage = serializedGame.statusMessageId ? await channel.messages.fetch(serializedGame.statusMessageId) : null;

		// Set up a partial game state object
		const partialGame = {
			channel,
			config,
			statusMessage,
		};

		// Get current state: if not inactive that means doing a recount
		const state: GameState = serializedGame.status === 'inactive' ? { status: 'inactive' } : await recount(partialGame);

		// If necessary, get currently-disqualified users
		if (gameStateIsAwaitingMatch(state) || gameStateIsAwaitingNext(state)) {
			state.disqualifiedFromRound = new Set(await Promise.all((serializedGame.disqualifiedFromRound ?? []).map((id) => discordClient.users.fetch(id))));
		}

		// Put together the final game object
		const game: Game = {
			channel,
			config,
			state,
			statusMessage,
		};

		// If we did a recount, update game status message
		if (serializedGame.status !== 'inactive') await updateGameStatusMessage(game);

		// Start timers if necessary
		setTimers(game, state);

		return game;
	})));

	console.log("Finished loading from storage");
}
