import type { MessageOptions, MessageEditOptions, EmbedField, User } from 'discord.js';
import { Constants } from 'discord.js';

import { getScoresEmbedField, formatScores } from './scoring';
import { getMessageUsers } from './message';
import { toList } from './string';
import { clearTimers, setTimers } from './timers';
import { getFormattedDeadline } from './deadline';
import { setUnion } from './set';
import { persist } from './state';

// To ease tests
import * as thisModule from './game-state';

/**
 * Game state discriminators.
 */
export function gameStateIsFree(gameState: GameState): gameState is GameStateFree {
	return gameState.status === 'free';
}
export function gameStateIsAwaitingNext(gameState: GameState): gameState is GameStateAwaitingNext {
	return gameState.status === 'awaiting-next';
}
export function gameStateIsAwaitingMatch(gameState: GameState): gameState is GameStateAwaitingMatch {
	return gameState.status === 'awaiting-match';
}
export function gameStateIsInactive(gameState: GameState): gameState is GameStateInactive {
	return gameState.status === 'inactive';
}

/**
 * Format a game status string.
 */
export function formatGameStatus(game: Game): string {
	if (thisModule.gameStateIsInactive(game.state))
		return "Inactive.";
	if (thisModule.gameStateIsAwaitingMatch(game.state))
		return `Awaiting tag match from anyone but ${toList(setUnion(getMessageUsers(game.state.tag), game.state.disqualifiedFromRound), "or")}.`;
	if (thisModule.gameStateIsAwaitingNext(game.state))
		return `Awaiting next tag from ${toList(getMessageUsers(game.state.match), "or")}, deadline ${getFormattedDeadline(game, 'R')}.`;
	if (thisModule.gameStateIsFree(game.state))
		return "Awaiting first tag.";
	throw new Error(`Unexpected game status string ${game.state.status}`);
}

/**
 * Get the status embed field.
 */
export function getStatusEmbedField(game: Game): EmbedField {
	return {
		inline: false,
		name: "Status",
		value: thisModule.formatGameStatus(game),
	};
}

/**
 * Format a game status message.
 */
export function formatGameStatusMessage(game: Game): MessageOptions & MessageEditOptions {
	return {
		embeds: [{
			title: "Tag game status",
			description: "The current tag game started here at this message. The status and scoreboard below will be kept updated throughout the game.",
			fields: [
				thisModule.getStatusEmbedField(game),
				getScoresEmbedField(game, 'full'),
			],
		}],
	};
}

/**
 * Update the game status message.
 *
 * Returns true or false based on whether the message was found and updated.
 */
export async function updateGameStatusMessage(game: Game): Promise<void> {
	if (game.statusMessage == null) {
		console.warn("Wanted to update the game status message but there's no reference to it.");
		return;
	}
	await game.statusMessage.edit(thisModule.formatGameStatusMessage(game));
}

/**
 * Update the game state.
 *
 * This clears an old timer or sets a new reminder timer if appropriate.
 * This also updates the game status message by default.
 */
export async function updateGameState(game: Game, newState: GameState, updateStatus: boolean = true): Promise<void> {
	// Clear old timers if appropriate
	clearTimers(game);

	// Set timers if appropriate
	setTimers(game, newState);

	// Set state
	game.state = newState;

	// Update status message
	if (updateStatus)
		await thisModule.updateGameStatusMessage(game);
}

/**
 * Get the disqualified players embed field.
 */
export function getDisqualifiedPlayersEmbedField(game: Game): EmbedField | null {
	if (!gameStateIsAwaitingNext(game.state) && !gameStateIsAwaitingMatch(game.state)) {
		return null;
	}
	return {
		inline: false,
		name: "Users disqualified from this round",
		value: game.state.disqualifiedFromRound.size ? toList(game.state.disqualifiedFromRound) : "None",
	};
}

/**
 * Start a game.
 */
export async function start(game: Game): Promise<void> {
	if (!thisModule.gameStateIsInactive(game.state)) {
		throw new Error("Game is already running");
	}

	// Update game state
	await thisModule.updateGameState(game, {
		status: 'free',
		scores: new Map(),
	}, false);

	// Post new game status message
	game.statusMessage = await game.channel.send(thisModule.formatGameStatusMessage(game));
	await game.statusMessage.pin();

	// Save
	persist();

	// Announce in chat channel if there is one
	if (game.config.chatChannel) {
		await game.config.chatChannel.send({
			embeds: [{
				title: "Tag game started",
				description: `The tag game in ${game.channel} has begun!`,
				fields: [
					{
						name: "Links",
						value: `[Jump to start of game](${game.statusMessage.url})`,
					},
				],
			}],
		});
	}
}

/**
 * Finish a game.
 *
 * Depending on game configuration it may immediately restart.
 *
 * Pass true for the "endOfPeriod" parameter if this was triggered by the end of
 * the game's period coming around.
 */
export async function finish(game: Game, endOfPeriod: boolean): Promise<void> {
	if (thisModule.gameStateIsInactive(game.state)) {
		throw new Error("Game is not running");
	}

	// Post new message in game channel with game results
	const resultsMessage = await game.channel.send({
		embeds: [{
			title: "Game results",
			fields: [
				getScoresEmbedField(game, 'full'),
				{
					name: "Links",
					value: game.statusMessage != null ? `[Jump to start of game](${game.statusMessage.url})` : '',
				},
			],
		}],
	});

	// Collect things to do in parallel
	const promises = [];

	// Pin the results message
	promises.push(resultsMessage.pin());

	// Edit the status message to just mark the start of the game
	if (game.statusMessage == null) {
		console.warn("Wanted to update the status message to mark the start of the game and unpin it, but there's no reference to it");
	} else {
		promises.push(game.statusMessage.edit({
			embeds: [{
				title: "Start of tag game",
				description: "This message marks the start of a tag game which has now finished.",
				fields: [
					{
						name: "Links",
						value: `[Jump to end of the game and scores](${resultsMessage.url})`,
					},
				],
			}],
		}));

		// Unpin the start of game message
		promises.push(game.statusMessage.unpin());
	}

	// Announce in chat channel
	if (game.config.chatChannel) {
		promises.push(game.config.chatChannel.send({
			embeds: [{
				title: "Tag game over",
				description: `The tag game in ${game.channel} has finished!`,
				fields: [
					getScoresEmbedField(game, 'brief'),
					{
						name: "Links",
						value: (game.statusMessage != null ? `[Jump to start of game](${game.statusMessage.url})\n` : '') + `[Jump to end of game and full scores](${resultsMessage.url})`,
					},
				],
			}],
		}));
	}

	// Wait for them all to finish
	await Promise.all(promises);

	// Forget the status message, which is no longer the status message
	game.statusMessage = null;

	// Update game state
	await thisModule.updateGameState(game, { status: 'inactive' }, false);

	if (game.config.autoRestart && endOfPeriod) {
		// The game is configured to auto-restart,
		// and either a period just finished.
		await thisModule.start(game);
	} else {
		// Save; in the other branch start is being run, which will save
		persist();
	}
}
