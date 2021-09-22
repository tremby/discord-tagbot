import type { TextChannel, User, Message, EmbedFieldData } from 'discord.js';

import { gameStateIsFree, gameStateIsAwaitingNext, gameStateIsAwaitingMatch, gameStateIsArchived } from './game-state';
import { messageHasImage, getMessageUsers, deleteMessage } from './message';
import { pluralize, msToHumanReadable, toList } from './string';
import { getAllMessages } from './channel';
import { getFormattedDeadline } from './deadline';
import { setIntersection } from './set';

/**
 * Given a game's configuration and current state and an incoming message,
 * determine what its new state should be.
 *
 * This returns null if nothing needs to be done.
 */
export async function handleMessage(game: Game, message: Message, mode: 'recount' | 'live'): Promise<GameState | null> {
	console.log(`Channel ${game.channel} (${game.state.status}): message ${message.url}`);

	// Ignore anything sent by this bot
	if (message.author === message.client.user) {
		console.log(`  Authored by this bot; ignore`);
		return null;
	}

	if (gameStateIsFree(game.state) || gameStateIsAwaitingNext(game.state)) {
		// Ensure image is present
		if (!messageHasImage(message)) {
			console.log(`  Message has no image`);
			return null;
		}

		let tagIsLate = false;

		if (gameStateIsAwaitingNext(game.state)) {
			// Ensure this user was allowed to post the next tag
			const allowed = getMessageUsers(game.state.match);

			if (!allowed.has(message.author)) {
				console.log(`  Not posted by one of the users who posted the previous match`);
				if (mode === 'recount') {
					console.log("    Ignoring since this is a recount");
				} else {
					console.log("    Informing the user and deleting the message");
					await Promise.all([
						(game.config.chatChannel ?? game.channel).send({
							content: `${message.member}, you just tried to post an image ${game.config.chatChannel ? `in ${game.config.chatChannel} ` : ""}but we're waiting on a new tag from ${toList(allowed, "or")}. If a tag was missing in their post, get them to add it then try again.`,
						}),
						deleteMessage(message),
					]);
				}
				return null
			}

			// Check if the next tag was not within the time limit
			if (game.config.nextTagTimeLimit != null) {
				if (message.createdTimestamp - game.state.match.createdTimestamp > game.config.nextTagTimeLimit) {
					tagIsLate = true;
					console.log(`  Posted more than the time limit (${game.config.nextTagTimeLimit}ms) after the match`);
				}
			}
		}

		// Announce new tag
		if (mode === 'live') {
			const authors = getMessageUsers(message);
			const lateHelp = `*If no action is taken, the game will continue. Scores will be recalculated if the tag and previous match are deleted.*`;
			if (game.config.chatChannel) {
				// Purposefully not awaiting this
				console.log("  Announcing new tag");
				game.config.chatChannel.send({
					content: tagIsLate ? `${toList(authors)}, your new tag is late.\n\n${toList(game.config.tagJudgeRoles) || "Judges"}, will you let it stand?\n${lateHelp}` : undefined,
					embeds: [
						...[...message.attachments.values()].map((attachment) => ({
							title: "New tag",
							description: `New tag in ${game.channel}!`,
							image: { url: attachment.url },
							fields: [
								{
									name: "Tagged by",
									value: toList(authors),
								},
								{
									name: "Date",
									value: `<t:${Math.round(message.createdTimestamp / 1e3)}>`,
									inline: true,
								},
								gameStateIsAwaitingNext(game.state) ? {
									name: "Time taken",
									value: msToHumanReadable(message.createdTimestamp - game.state.match.createdTimestamp),
									inline: true,
								} : undefined,
								{
									name: "Link",
									value: `[See tag post](${message.url})`,
								},
							].filter((field) => field),
						})),
					],
				});
			} else if (tagIsLate) {
				// Purposefully not awaiting this
				console.log("  No chat channel, so we need to post a warning message in the game channel");
				game.channel.send({
					content: `${toList(game.config.tagJudgeRoles) || "Judges"}, this tag is late. It's up to you to pass judgement.\n${lateHelp}`,
					embeds: [{
						title: "Info",
						fields: [
							{
								name: "Time taken",
								value: msToHumanReadable(message.createdTimestamp - (game.state as GameStateAwaitingNext).match.createdTimestamp),
								inline: true,
							},
						].filter((field) => field),
					}],
				});
			}
		}

		// Return new state
		console.log("  New state: awaiting-match");
		return {
			status: "awaiting-match",
			scores: game.state.scores,
			tag: message,
		} as GameStateAwaitingMatch;
	}

	if (gameStateIsAwaitingMatch(game.state)) {
		// Get users who posted the tag
		const tagAuthors = getMessageUsers(game.state.tag);

		// Ensure image is present
		if (!messageHasImage(message)) {
			console.log(`  Message has no image`);
			return null;
		}

		// Get all authors of this match
		const authors = getMessageUsers(message);

		// Get intersection of authors of the match with authors of the tag
		const commonAuthors = setIntersection<User | string>(authors, tagAuthors);
		if (commonAuthors.has(message.author)) {
			commonAuthors.delete(message.author);
			commonAuthors.add("you");
		}

		// Complain if any of the tag authors were involved with this match
		if (commonAuthors.size) {
			console.log(`  Message involved a user who was one of those who posted the tag we're matching`);
			if (mode === 'live') {
				const otherAuthors = new Set(authors);
				otherAuthors.delete(message.author);
				console.log(`    Informing the user and deleting the message`);
				await Promise.all([
					(game.config.chatChannel ?? game.channel).send({
						content: `${message.member}, you just tried to post an image ${game.config.chatChannel ? `in ${game.config.chatChannel} ` : ""}${otherAuthors.size ? `along with ${toList(otherAuthors)} ` : ""}but ${toList(commonAuthors)} ${commonAuthors.size === 1 && commonAuthors.has("you") ? "were an author" : commonAuthors.size === 1 ? "was an author" : "were authors"} of the current tag. We're waiting on someone else to match it.`,
					}),
					deleteMessage(message),
				]);
				return null;
			} else {
				console.log("    Accepting anyway since this is a recount");
			}
		}

		// Award points
		const score = 1;
		console.log(`  Awarding score of ${score} to ${toList(authors)}`);
		const newScores = new Map(game.state.scores);
		for (const user of authors) {
			if (newScores.has(user)) {
				const oldScore = newScores.get(user);
				const newScore = oldScore + score;
				console.log(`    ${user}: ${oldScore} -> ${newScore}`);
				newScores.set(user, newScore);
			} else {
				console.log(`    ${user}: 0 -> ${score}`);
				newScores.set(user, score);
			}
		}

		// Prepare new state
		const newState = {
			status: "awaiting-next",
			scores: newScores,
			match: message,
		} as GameStateAwaitingNext;

		if (mode === 'live' && game.config.chatChannel) {
			// Announce new match
			const state = game.state;
			console.log("  Announcing new match in chat channel");
			// Purposefully not awaiting this
			game.config.chatChannel.send({
				embeds: [
					...[...message.attachments.values()].map((attachment) => ({
						title: "New tag match",
						description: `Tag matched in ${game.channel}!`,
						image: { url: attachment.url },
						fields: [
							{
								name: "Matched by",
								value: toList(authors),
							},
							{
								name: "Date",
								value: `<t:${Math.round(message.createdTimestamp / 1e3)}>`,
								inline: true,
							},
							{
								name: "Time taken",
								value: msToHumanReadable(message.createdTimestamp - state.tag.createdTimestamp),
								inline: true,
							},
							{
								name: "Deadline for next tag",
								value: getFormattedDeadline({ ...game, state: newState }, 'R'),
								inline: true,
							},
							{ ...getScoreChangesEmbedField(getChangedScores(game.state.scores, newState.scores)), inline: true },
							{ ...getScoresEmbedField({ ...game, state: newState }, 'brief'), inline: true },
							{
								name: "Links",
								value: `[See tag match post](${message.url})\n[See original tag](${state.tag.url})`,
							},
						],
					})),
				],
			});
		}

		// Set new state
		console.log(`  New state: awaiting-next`);
		return newState;
	}

	if (gameStateIsArchived(game.state)) {
		if (mode === 'recount') {
			// This should never happen
			throw new Error(`Status should never be "archived" when recalculating`);
		}

		// Ignore text-only
		if (!messageHasImage(message)) {
			console.log(`  Message has no image`);
			return null;
		}

		// Post something and delete message
		console.log("  Informing user and deleting message");
		await Promise.all([
			(game.config.chatChannel ?? game.channel).send({
				content: `${message.member}, you just tried to post an image ${game.config.chatChannel ? `in ${game.channel} ` : ""}but this game is archived.`,
			}),
			deleteMessage(message),
		]);

		return null;
	}

	throw new Error("Unexpected situation");
}

/**
 * Recalculate the scores on demand.
 *
 * @param {PartialBy<Game, 'state'>} game - Game metadata but the state is not
 * required (it'll be ignored)
 */
export async function recount(game: PartialBy<Game, 'state'>): Promise<GameState> {
	console.log("Started recalculating");

	// Initial state
	let state: GameState = {
		status: "free",
		scores: new Map(),
	}

	// Step through all messages
	for (const message of await getAllMessages(game.channel, true)) {
		const newState = await handleMessage({ ...game, state }, message, 'recount');
		if (newState == null) continue;
		state = newState;
	}

	console.log(`Finished recalculating; state is ${state.status}`);

	return state;
}

/**
 * Format a set of scores into a string.
 */
export function formatScores(scores: Scores, max: number | null = null): string {
	// Get records as array
	let records = [...scores.entries()];

	// Sort by score descending
	records.sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

	// Limit those if appropriate
	if (max != null) {
		records = records.slice(0, max);
	}

	// Format
	return records.map(([user, score]: [User, number], index) => `${maybeMedal(index + 1, " ")}${user}: ${score}`).join("\n");
}

/**
 * Return a medal emoji based on a position, if it's in the top 3.
 *
 * Optionally add a suffix if a medal is returned.
 */
function maybeMedal(position: number, suffix: string = ""): string {
	let output = "";
	switch (position) {
		case 1: output = '🥇'; break;
		case 2: output = '🥈'; break;
		case 3: output = '🥉'; break;
	}
	if (output.length) output += suffix;
	return output;
}

/**
 * Get a message about a game's scores.
 */
function getScoresMessage(game: Game, format: 'brief' | 'full'): string {
	if (game.state.scores == null)
		return `See [pinned status post](${game.statusMessage.url})`;
	if (game.state.scores.size === 0)
		return "None yet";
	if (format === 'brief' && game.state.scores.size > 3)
		return `${formatScores(game.state.scores, 3)}\nSee [the pinned game status](${game.statusMessage.url}) for the full scoreboard.`;
	return formatScores(game.state.scores);
}

/**
 * Get the scores embed field.
 */
export function getScoresEmbedField(game: Game, format: 'brief' | 'full'): EmbedFieldData {
	return {
		name: format === 'brief' ? "Top scores" : "Scores",
		value: getScoresMessage(game, format),
	};
}

/**
 * Get changed scores.
 */
export function getChangedScores(oldScores: Scores, newScores: Scores): ScoreChanges {
	const changes: ScoreChanges = new Map();

	// Look through old scores and find the same users' entries in new scores
	for (const [user, before] of oldScores) {
		const after = newScores.get(user) ?? 0;
		if (before !== after) {
			changes.set(user, { before, after });
		}
	}

	// Look through new scores for anything which didn't exist in old scores
	for (const [user, after] of newScores) {
		if (changes.has(user)) continue; // Already recorded this one
		const before = oldScores.get(user) ?? 0;
		if (before !== after) {
			changes.set(user, { before, after });
		}
	}

	return changes;
}

/**
 * Get the score changes embed field.
 */
export function getScoreChangesEmbedField(changedScores: ScoreChanges): EmbedFieldData {
	return {
		name: "Changed scores",
		value: changedScores.size === 0 ? "None" : [...changedScores.entries()].map(([user, { before, after }]) => `${user}: ${before} → ${after}`).join("\n"),
	};
}
