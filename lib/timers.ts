import { gameStateIsAwaitingNext, gameStateIsAwaitingMatch, gameStateIsFree, updateGameState, getExcludedPlayersEmbedField } from './game-state';
import { pluralize, toList } from './string';
import { getMessageUsers, deleteMessage } from './message';
import { getDeadlineTimestamp, getFormattedDeadline } from './deadline';
import { recount, getChangedScores, getScoreChangesEmbedField, getScoresEmbedField } from './scoring';
import { setUnion } from './set';

const REMINDER_INTERVAL_MS = 1e3 * 60 * 5;
const REMINDER_FRACTION = 0.1;

/**
 * Set timers for a game state, if appropriate.
 */
export function setTimers(game: Game, state: GameState): void {
	setReminderTimer(game, state);
	setTimeUpTimer(game, state);
}

/**
 * Set reminder timer, if appropriate.
 */
function setReminderTimer(game: Game, state: GameState): void {
	// No reminder if we aren't awaiting the next tag
	if (!gameStateIsAwaitingNext(state)) return;

	// No reminder if there's no time limit
	if (game.config.nextTagTimeLimit == null) return;

	// No reminder if the deadline is in the past
	if (getDeadlineTimestamp({ ...game, state }) < Date.now()) return;

	// No reminder if the time limit is less than twice the interval
	if (game.config.nextTagTimeLimit < 2 * REMINDER_INTERVAL_MS) return;

	// Start from a fraction of the time limit, and round up to the next interval
	const reminderAtTimeLeft = Math.ceil(game.config.nextTagTimeLimit * REMINDER_FRACTION / REMINDER_INTERVAL_MS) * REMINDER_INTERVAL_MS;

	// What time should the reminder be sent?
	const reminderTimestamp = state.match.createdTimestamp + game.config.nextTagTimeLimit - reminderAtTimeLeft;

	// How long is that from now
	const timeUntilReminder = reminderTimestamp - Date.now();

	// Abort if that's in the past (which it could be if we just dealt with a
	// deletion or similar
	if (timeUntilReminder < 0) return;

	// Set the timer
	const timer = setTimeout(getReminderHandler(game), timeUntilReminder);

	// Store the timer in the game state so it can be cleared if necessary
	state.reminderTimer = timer;
}

/**
 * Set "time up" timer, if appropriate.
 */
function setTimeUpTimer(game: Game, state: GameState): void {
	// No timer if we aren't awaiting the next tag
	if (!gameStateIsAwaitingNext(state)) return;

	// No timer if there's no time limit
	if (game.config.nextTagTimeLimit == null) return;

	// No timer if the deadline is in the past
	const timeUntilDeadline = getDeadlineTimestamp({ ...game, state }) - Date.now();
	if (timeUntilDeadline < 0) return;

	// Set the timer
	const timer = setTimeout(getTimeUpHandler(game), timeUntilDeadline);

	// Store the timer in the game state so it can be cleared if necessary
	state.timeUpTimer = timer;
}

/**
 * Get a reminder handler for a particular game.
 */
function getReminderHandler(game: Game): (() => Promise<void>) {
	return async function reminderHandler(): Promise<void> {
		// No reminder if we aren't awaiting the next tag
		if (!gameStateIsAwaitingNext(game.state)) {
			console.error("Was going to send a reminder but we are no longer awaiting the next tag. A timer should have been cleared somewhere.");
			return;
		}

		// Clear stored reference to timer identifier
		game.state.reminderTimer = null;

		// Send the reminder
		await (game.config.chatChannel ?? game.channel).send({
			content: `${toList(getMessageUsers(game.state.match))}, time is running out! The deadline for your next tag is ${getFormattedDeadline(game, 'R')}`,
		});
	};
}

/**
 * Get a "time up" handler for a particular game.
 */
function getTimeUpHandler(game: Game): (() => Promise<void>) {
	return async function timeUpHandler(): Promise<void> {
		// No reminder if we aren't awaiting the next tag
		if (!gameStateIsAwaitingNext(game.state)) {
			console.error("Was going to send a time up message but we are no longer awaiting the next tag. A timer should have been cleared somewhere.");
			return;
		}

		// Clear stored reference to timer identifier
		game.state.timeUpTimer = null;

		// Remember some details of the match
		const matchUsers = getMessageUsers(game.state.match);
		const attachment = game.state.match.attachments[0];

		// Delete the match
		await deleteMessage(game.state.match);

		// Recount and set the new state
		const oldState = game.state;
		const newState = await recount(game);
		if (gameStateIsAwaitingMatch(newState)) {
			// This should always be true
			newState.excludedFromRound = setUnion(oldState.excludedFromRound, matchUsers);
		}
		await updateGameState(game, newState);
		if (!gameStateIsAwaitingMatch(newState)) {
			console.error("After deleting the match, expected state to go back to awaiting match.");
			return;
		}

		// Announce that the time limit was missed
		await (game.config.chatChannel ?? game.channel).send({
			content: `${toList(matchUsers)}, time has run out.`,
			embeds: [{
				title: "Tag match expired",
				description: `${toList(matchUsers)} didn't post a new tag in ${game.channel} before the time ran out. Their match was deleted. The previous tag is open for matching again!`,
				thumbnail: { url: attachment.url },
				fields: [
					{ ...getScoreChangesEmbedField(getChangedScores(oldState.scores, newState.scores)), inline: true },
					{ ...getScoresEmbedField(game, 'brief'), inline: true },
					newState.excludedFromRound.size ? { ...getExcludedPlayersEmbedField(newState.excludedFromRound), inline: true } : [],
					{
						name: "Links",
						value: [
							`[See current tag](${newState.tag.url})`,
							game.statusMessage != null ? `[See pinned game status post](${game.statusMessage.url})` : [],
						].flat().join("\n"),
					},
				].flat(),
			}],
		});
	};
}

/**
 * Clear the timers.
 */
export function clearTimers(game: Game): void {
	clearReminderTimer(game);
	clearTimeUpTimer(game);
}

/**
 * Clear the reminder timer.
 */
function clearReminderTimer(game: Game): void {
	if (!gameStateIsAwaitingNext(game.state)) return;
	clearTimeout(game.state.reminderTimer);
	game.state.reminderTimer = null;
}

/**
 * Clear the time up timer.
 */
function clearTimeUpTimer(game: Game): void {
	if (!gameStateIsAwaitingNext(game.state)) return;
	clearTimeout(game.state.timeUpTimer);
	game.state.timeUpTimer = null;
}
