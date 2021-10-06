import { gameStateIsAwaitingNext } from './game-state';
import { pluralize, toList } from './string';
import { getMessageUsers } from './message';
import { getDeadlineTimestamp, getFormattedDeadline } from './deadline';

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
	const timer = setTimeout(getReminderSender(game), timeUntilReminder);

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
	const timer = setTimeout(getTimeUpSender(game), timeUntilDeadline);

	// Store the timer in the game state so it can be cleared if necessary
	state.timeUpTimer = timer;
}

/**
 * Get a reminder sender for a particular game.
 */
function getReminderSender(game: Game): (() => Promise<void>) {
	return async function reminderSender(): Promise<void> {
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
 * Get a "time up" sender for a particular game.
 */
function getTimeUpSender(game: Game): (() => Promise<void>) {
	return async function timeUpSender(): Promise<void> {
		// No reminder if we aren't awaiting the next tag
		if (!gameStateIsAwaitingNext(game.state)) {
			console.error("Was going to send a time up message but we are no longer awaiting the next tag. A timer should have been cleared somewhere.");
			return;
		}

		// Clear stored reference to timer identifier
		game.state.timeUpTimer = null;

		// Send the message
		const users = getMessageUsers(game.state.match);
		const minutes = game.config.nextTagTimeLimit / 1e3 / 60;
		await (game.config.chatChannel ?? game.channel).send({
			content: `${toList(users)}, time has run out.\n\n${toList(game.config.tagJudgeRoles) || "Judges"}, what will you do?\n*If the match post is deleted, the game will recalculate. If it is not deleted and a new tag is posted, another warning message will be posted. Another option is to temporarily change the time limit.*`,
			embeds: [{
				title: "Time is up",
				description: `${toList(users)} didn't post a new tag in ${game.channel} before the time ran out. Will they be shown mercy?`,
				fields: [
					{
						name: "Users",
						value: toList(users),
						inline: true,
					},
					{
						name: "Match posted",
						value: `<t:${Math.round(game.state.match.createdTimestamp / 1e3)}>`,
						inline: true,
					},
					{
						name: "Time limit",
						value: `${minutes} ${pluralize("minute", minutes)}`,
						inline: true,
					},
					{
						name: "Deadline",
						value: getFormattedDeadline(game, 'R'),
						inline: true,
					},
					{
						name: "Links",
						value: `[See tag match post](${game.state.match.url})${game.statusMessage == null ? '' : `\n[See pinned game status post](${game.statusMessage.url})`}`,
					},
				],
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
