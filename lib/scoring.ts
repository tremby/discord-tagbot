import * as thisModule from './scoring';

import type { TextChannel, User, Message, EmbedFieldData } from 'discord.js';

import { gameStateIsFree, gameStateIsAwaitingNext, gameStateIsAwaitingMatch, gameStateIsInactive } from './game-state';
import { messageHasImage, getMessageUsers, deleteMessage } from './message';
import { pluralize, msToHumanReadable, toList } from './string';
import { getAllMessagesSince } from './channel';
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
	if (message.author.id === message.client.user.id) {
		console.log(`  Authored by this bot; ignore`);
		return null;
	}

	// Ensure image is present
	if (!messageHasImage(message)) {
		console.log(`  Message has no image`);
		return null;
	}

	if (gameStateIsFree(game.state) || gameStateIsAwaitingNext(game.state)) {
		const authors = getMessageUsers(message);

		if (gameStateIsAwaitingNext(game.state)) {
			// Ensure this user was allowed to post the next tag
			const allowed = getMessageUsers(game.state.match);
			const intersection = setIntersection(allowed, authors);

			if (intersection.size === 0) {
				console.log(`  Not posted by (and doesn't mention) one of the users who posted the previous match`);
				if (mode === 'recount') {
					console.log("    Accepting anyway since this is a recount");
				} else {
					console.log("    Informing the user and deleting the message");
					await Promise.all([
						(game.config.chatChannel ?? game.channel).send({
							content: `${message.author}, you just tried to post an image ${game.config.chatChannel ? `in ${game.channel} ` : ""}but we're waiting on a new tag from ${toList(allowed, "or")}. If a tag was missing in their post, get them to add it then try again.`,
						}),
						deleteMessage(message),
					]);
					return null;
				}
			}

			// Check if the next tag was not within the time limit
			if (game.config.nextTagTimeLimit != null) {
				if (message.createdTimestamp - game.state.match.createdTimestamp > game.config.nextTagTimeLimit) {
					console.log(`  Posted more than the time limit (${game.config.nextTagTimeLimit}ms) after the match`);

					if (mode === 'recount') {
						console.log("    Accepting anyway since this is a recount");
					} else {
						// We shouldn't really be here; the match should have
						// been deleted when the time ran out
						console.log("    Informing the user and deleting both the new tag and the match");
						await Promise.all([
							(game.config.chatChannel ?? game.channel).send({
								content: `${message.author}, you just tried to post a new tag ${game.config.chatChannel ? `in ${game.channel} ` : ""}but time had already run out. Your tag and the match before have been removed, and you're disqualified until next round!`,
							}),
							deleteMessage(message),
							deleteMessage(game.state.match),
						]);

						// Get new game state
						console.log("    Recounting, since we now need to await another new match");
						const newState = await thisModule.recount(game);

						// Ban everyone involved with the match from this round
						/* istanbul ignore else */
						if (gameStateIsAwaitingMatch(newState)) {
							for (const user of getMessageUsers(game.state.match)) {
								newState.disqualifiedFromRound.add(user);
							}
						}

						// Return the new state
						return newState;
					}
				}
			}
		}

		// Announce new tag
		if (mode === 'live') {
			if (game.config.chatChannel) {
				// Purposefully not awaiting this
				console.log("  Announcing new tag");
				game.config.chatChannel.send({
					embeds: [
						...[...message.attachments.values()].map((attachment) => ({
							title: "New tag",
							description: `New tag in ${game.channel}!`,
							thumbnail: { url: attachment.url },
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
			}
		}

		// Return new state
		console.log("  New state: awaiting-match");
		return {
			status: "awaiting-match",
			scores: game.state.scores,
			tag: message,
			disqualifiedFromRound: new Set(),
		} as GameStateAwaitingMatch;
	}

	if (gameStateIsAwaitingMatch(game.state)) {
		// Get users who posted the tag
		const tagAuthors = getMessageUsers(game.state.tag);

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
						content: `${message.author}, you just tried to post an image ${game.config.chatChannel ? `in ${game.channel} ` : ""}${otherAuthors.size ? `along with ${toList(otherAuthors)} ` : ""}but ${toList(commonAuthors)} ${commonAuthors.size === 1 && commonAuthors.has("you") ? "were an author" : commonAuthors.size === 1 ? "was an author" : "were authors"} of the current tag. We're waiting on someone else to match it.`,
					}),
					deleteMessage(message),
				]);
				return null;
			} else {
				console.log("    Accepting anyway since this is a recount");
			}
		}

		// Get intersection of authors of the match with disqualified users
		const disqualifiedAuthors = setIntersection<User | string>(game.state.disqualifiedFromRound, authors);
		if (disqualifiedAuthors.has(message.author)) {
			disqualifiedAuthors.delete(message.author);
			disqualifiedAuthors.add("you");
		}

		// Complain if any of the currently-disqualified players were involved with this match
		if (disqualifiedAuthors.size) {
			console.log(`  Message involved one or more users who are disqualified from the current round`);
			if (mode === 'live') {
				const otherAuthors = new Set(authors);
				otherAuthors.delete(message.author);
				await Promise.all([
					(game.config.chatChannel ?? game.channel).send({
						content: `${message.author}, you just tried to post an image ${game.config.chatChannel ? `in ${game.channel} ` : ""}${otherAuthors.size ? `along with ${toList(otherAuthors)} ` : ""}but ${toList(disqualifiedAuthors)} ${disqualifiedAuthors.size === 1 && disqualifiedAuthors.has("you") ? "are" : disqualifiedAuthors.size === 1 ? "is" : "are"} disqualified until the next tag. We're waiting on someone else to match this one.`,
					}),
					deleteMessage(message),
				]);
				return null;
			} else {
				console.log("    Accepting anyway since this is a recount (this should never happen anyway; there are no disqualified users during a recount)");
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
			disqualifiedFromRound: new Set(game.state.disqualifiedFromRound),
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
						thumbnail: { url: attachment.url },
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
							{ ...thisModule.getScoreChangesEmbedField(thisModule.getChangedScores(game.state.scores, newState.scores)), inline: true },
							{ ...thisModule.getScoresEmbedField({ ...game, state: newState }, 'brief'), inline: true },
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

	if (gameStateIsInactive(game.state)) {
		if (mode === 'recount') {
			// This should never happen
			throw new Error(`Status should never be "inactive" when recalculating`);
		}

		// Post something and delete message
		console.log("  Informing user and deleting message");
		await Promise.all([
			(game.config.chatChannel ?? game.channel).send({
				content: `${message.author}, you just tried to post an image ${game.config.chatChannel ? `in ${game.channel} ` : ""}but this game is inactive.`,
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
 * Note that this cannot know which players should be disqualified from the current
 * round, and will always produce an empty disqualification list.
 *
 * @param {PartialBy<Game, 'state'>} game - Game metadata but the state is not
 * required (it'll be ignored)
 */
export async function recount(game: PartialBy<Game, 'state'>): Promise<GameState> {
	console.log("Started recalculating");

	// Initial state
	let state: GameState = {
		status: 'free',
		scores: new Map(),
	}

	// Step through all messages
	for await (const message of getAllMessagesSince(game.channel, game.statusMessage, true)) {
		const newState = await thisModule.handleMessage({ ...game, state }, message, 'recount');
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
	const records = [...scores.entries()];

	// Sort by score descending
	records.sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

	// Rejig the scores map to be keyed by score and point to a list of users
	const byScore: Map<number, User[]> = new Map();
	for (const [user, score] of scores) {
		if (byScore.has(score)) byScore.get(score).push(user);
		else byScore.set(score, [user]);
	}

	// Sort all the user lists by ID, just for stability
	for (const [, users] of byScore) {
		users.sort((userA, userB) => Number(BigInt(userA.id) - BigInt(userB.id)));
	}

	// Sort by score descending
	const sortedByScore = new Map([...byScore].sort(([scoreA], [scoreB]) => scoreB - scoreA));

	// Limit those if appropriate
	let displayable = [...sortedByScore];
	if (max != null) {
		displayable = displayable.slice(0, max);
	}

	// Format
	return displayable.map(([score, users]: [number, User[]], index) => `${maybeMedal(index + 1)}${toList(users)}: ${score}`).join("\n");
}

/**
 * Return a medal emoji based on a position, if it's in the top 3.
 *
 * Optionally add a suffix if a medal is returned.
 */
function maybeMedal(position: number): string {
	let output = "";
	switch (position) {
		case 1: output = '🥇'; break;
		case 2: output = '🥈'; break;
		case 3: output = '🥉'; break;
	}
	if (output.length) output += " ";
	return output;
}

/**
 * Get a message about a game's scores.
 */
function getScoresMessage(game: Game, format: 'brief' | 'full'): string {
	if (gameStateIsInactive(game.state))
		return "None";
	if (game.state.scores.size === 0)
		return "None";
	if (format === 'brief' && game.state.scores.size > 3)
		return `${thisModule.formatScores(game.state.scores, 3)}${game.statusMessage == null ? '' : `\nSee [the pinned game status](${game.statusMessage.url}) for the full scoreboard.`}`;
	return thisModule.formatScores(game.state.scores);
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
