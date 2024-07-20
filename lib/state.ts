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

const notNull = <T>(item: T | null | undefined): item is T => item != null;

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

	const games = await Promise.all(data.games.map(async (serializedGame: SerializedGame, i: number) => {
		const errorPreamble = `When trying to recover game index ${i} (game channel ${serializedGame.channelId}), `;

		// Get the channel object
		const getChannel = async (channelId: string, designation: "game" | "chat") => {
			const logger = designation === "game" ? console.error : console.warn;
			try {
				const channel = (await discordClient.channels.fetch(channelId)) as TextChannel | null;
				if (channel == null) {
					logger(`${errorPreamble}the ${designation} channel (${channelId}) couldn't be retrieved (received null)`);
					return null;
				}
				return channel;
			} catch (error) {
				logger(`${errorPreamble}there was an error fetching the ${designation} channel (${channelId}): ${error}`);
				return null;
			}
		};
		const channel = await getChannel(serializedGame.channelId, "game");
		if (channel == null) return null;

		// Recover the game configuration
		const getRole = async (roleId: string) => {
			try {
				const role = await channel.guild.roles.fetch(roleId);
				if (role == null) {
					console.warn(`${errorPreamble}role ${roleId} couldn't be retrieved (received null)`);
					return null;
				}
				return role;
			} catch (error) {
				console.warn(`${errorPreamble}there was an error fetching role ${roleId}: ${error}`);
				return null;
			}
		};
		const config: Config = {
			nextTagTimeLimit: serializedGame.config.nextTagTimeLimit,
			tagJudgeRoles: new Set(
				(await Promise.all(serializedGame.config.tagJudgeRoleIds.map(getRole))).filter(notNull)
			),
			chatChannel: serializedGame.config.chatChannelId ? await getChannel(serializedGame.config.chatChannelId, "chat") : null,
			autoRestart: serializedGame.config.autoRestart,
			period: serializedGame.config.period,
			locale: serializedGame.config.locale,
			rankingStrategy: serializedGame.config.rankingStrategy ?? 'standardCompetition',
		};

		// Find the status message
		const getMessage = async (messageId: string) => {
			try {
				const message = await channel.messages.fetch(messageId);
				if (message == null) {
					console.error(`${errorPreamble}the status message (${messageId}) couldn't be retrieved (received null)`);
					return null;
				}
				return message;
			} catch (error) {
				console.error(`${errorPreamble}there was an error fetching the status message (${messageId}): ${error}`);
				return null;
			}
		};
		const statusMessage = serializedGame.statusMessageId ? await getMessage(serializedGame.statusMessageId) : null;

		// Set up a partial game state object
		const partialGame = {
			channel,
			config,
			statusMessage,
		};

		// Get current state: if not inactive that means doing a recount
		const state: GameState = serializedGame.status === 'inactive' ? { status: 'inactive' } : await recount(partialGame);

		// If necessary, get currently-disqualified users
		const getUser = async (userId: string) => {
			try {
				const user = await discordClient.users.fetch(userId);
				if (user == null) {
					console.warn(`${errorPreamble}disqualified user ${userId} couldn't be retrieved (received null)`);
					return null;
				}
				return user;
			} catch (error) {
				console.warn(`${errorPreamble}there was an error fetching disqualified user ${userId}: ${error}`);
				return null;
			}
		};
		if (gameStateIsAwaitingMatch(state) || gameStateIsAwaitingNext(state)) {
			state.disqualifiedFromRound = new Set((await Promise.all((serializedGame.disqualifiedFromRound ?? []).map((id) => getUser(id)))).filter(notNull));
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
	}));

	// Include any remaining games in our set of active games
	state.games = new Set(games.filter(notNull));

	console.log("Finished loading from storage");
}
