import type { MessageOptions, EmbedFieldData, User } from 'discord.js';
import { Constants } from 'discord.js';

import { getScoresEmbedField } from './scoring';
import { getMessageUsers } from './message';
import { getStatusMessage } from './channel';
import { toList } from './string';
import { clearTimers, setTimers } from './timers';
import { getFormattedDeadline } from './deadline';
import { setUnion } from './set';

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
export function gameStateIsArchived(gameState: GameState): gameState is GameStateArchived {
	return gameState.status === 'archived';
}

/**
 * Format a game status string.
 */
export function formatGameStatus(game: Game): string {
	if (thisModule.gameStateIsArchived(game.state))
		return "Archived.";
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
export function getStatusEmbedField(game: Game): EmbedFieldData {
	return {
		name: "Status",
		value: thisModule.formatGameStatus(game),
	};
}

/**
 * Format a game status message.
 */
export function formatGameStatusMessage(game: Game): MessageOptions {
	return {
		embeds: [{
			title: "Tag game status",
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
 * This searches for the message if it is not known yet,
 * updates it it found,
 * or posts and pins a new message otherwise.
 */
export async function updateGameStatusMessage(game: Game): Promise<void> {
	const statusMessage = thisModule.formatGameStatusMessage(game);

	// If we don't know of a status message, try to find it
	if (game.statusMessage == null) {
		game.statusMessage = await getStatusMessage(game.channel);
	}

	// Attempt to update an existing game status message
	try {
		if (game.statusMessage != null) {
			await game.statusMessage.edit(statusMessage);
			return;
		}
	} catch (error) {
		// We handle only "Unknown Message"
		if (error.code !== Constants.APIErrors.UNKNOWN_MESSAGE) {
			throw error;
		}
	}

	// If we're here we either caught "Unknown Message"
	// when trying to edit the existing game status message,
	// or we didn't find one at all,
	// so we send and pin a new one.
	game.statusMessage = await game.channel.send(statusMessage);
	await game.statusMessage.pin();
}

/**
 * Update the game state.
 *
 * This clears an old timer or sets a new reminder timer if appropriate.
 * This also updates the game status message.
 */
export async function updateGameState(game: Game, newState: GameState): Promise<void> {
	// Clear old timers if appropriate
	clearTimers(game);

	// Set timers if appropriate
	setTimers(game, newState);

	// Set state
	game.state = newState;

	// Update status message
	await thisModule.updateGameStatusMessage(game);
}

/**
 * Get the disqualified players embed field.
 */
export function getDisqualifiedPlayersEmbedField(players: Set<User>): EmbedFieldData {
	return {
		name: "Users disqualified from this round",
		value: players.size ? toList(players) : "None",
	};
}
