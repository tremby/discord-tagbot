import { gameStateIsAwaitingNext } from './game-state';

/**
 * Get the timestamp (milliseconds) for the game's deadline for the next tag.
 *
 * This expects the game to be awaiting the next tag; null will be returned
 * otherwise.
 *
 * Null is also returned if there is no deadline.
 */
export function getDeadlineTimestamp(game: Game): number | null {
	if (!gameStateIsAwaitingNext(game.state)) return null;
	if (game.config.nextTagTimeLimit == null) return null;
	return game.state.match.createdTimestamp + game.config.nextTagTimeLimit;
}

/**
 * Get a formatted deadline time.
 *
 * This expects the game to be awaiting the next tag; null will be returned
 * otherwise.
 *
 * Null is also returned if there is no deadline.
 */
export function getFormattedDeadline(game: Game, format: string | null = null): string | null {
	const deadline = getDeadlineTimestamp(game);
	if (deadline == null) return null;
	const formatString = format == null ? '' : `:${format}`;
	return `<t:${Math.round(deadline / 1e3)}${formatString}>`;
}
