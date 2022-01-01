import { Client, Intents, TextChannel } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

import commands from './commands';
import { ProblemCheckingPermissionsError, NoTextChannelError, isAdmin, isAdminOrTagJudge, getValidChannel } from './commands/lib/helpers';

import appState, { loadFromDisk, persistToDisk } from './lib/state';
import { channelIsTextChannel, getGameOfChannel } from './lib/channel';
import { handleMessage, recount, getScoresEmbedField, getChangedScores, getScoreChangesEmbedField } from './lib/scoring';
import { gameStateIsAwaitingMatch, gameStateIsAwaitingNext, gameStateIsInactive, updateGameState } from './lib/game-state';
import { messageHasImage, getMessageUsers } from './lib/message';
import { setsEqual } from './lib/set';

// Flag for whether we have finished loading any saved state or not
let finishedRestoring = false;

// Load configuration
import dotenv = require('dotenv');
dotenv.config();

// Check for configuration
for (const varname of ['DISCORD_TOKEN']) {
	if (!process.env[varname]) {
		console.error(`${varname} must be set`);
		process.exit(1);
	}
}

// Set up Discord client
const client = new Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
	],
});

// Actions to take on login
client.on('ready', async () => {
	console.log(`Logged in as ${client.user.tag}`);

	// Set activity status
	client.user.setPresence({ status: 'idle' });

	// Load state from disk and hydrate data
	try {
		await loadFromDisk(client);
	} catch (error) {
		if (error.code === 'ENOENT') {
			// No saved state; nothing needs to be done
			console.log("No saved state");
		} else {
			throw error;
		}
	}
	finishedRestoring = true;

	// Register slash commands
	const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);
	console.log("Registering slash commands");
	await rest.put(Routes.applicationCommands(client.application.id), {
		body: commands.map((command) => command.description),
	});
	console.log("...done");

	// Listen for and handle new messages
	client.on('messageCreate', async (message) => {
		// Ignore messages sent by this bot
		if (message.author === message.client.user) return;

		// Abort if the message isn't in a regular text channel
		const channel = message.channel;
		if (!channelIsTextChannel(channel)) return;

		// Try to find a game associated with this channel
		const game = getGameOfChannel(channel);

		// Do nothing if the message is in a channel not associated with a game
		if (game == null) return;

		// Calculate new state from configuration, old state, and message
		const newState = await handleMessage(game, message, 'live');

		// Do nothing if the state didn't change
		if (newState == null) return;

		// Update current game state
		await updateGameState(game, newState);
	});

	// Listen for message edits
	client.on('messageUpdate', async (oldMessage, newMessage) => {
		// Panic if the old and new channels are different
		if (oldMessage.channel !== newMessage.channel) {
			console.error(`Received a messageUpdate event where the old and new messages are in different channels. Ignoring. Old: ${JSON.stringify(oldMessage)}, new: ${JSON.stringify(newMessage)}`);
			// TODO: handle this? Could just recount both channels. But this is
			// probably an impossible situation -- it looks like Discord has no
			// feature to move messages.
			return;
		}

		// Ignore messages sent by this bot
		if (newMessage.author === newMessage.client.user) return;
		if (oldMessage.author === oldMessage.client.user) return;

		// Abort if the message isn't in a regular text channel
		const channel = newMessage.channel;
		if (!channelIsTextChannel(channel)) return;

		// Try to find a game associated with this channel
		const game = getGameOfChannel(channel);

		// Do nothing if the message is in a channel not associated with a game
		if (game == null) return;

		// Do nothing if there was no image before or after
		if (!messageHasImage(oldMessage) && !messageHasImage(newMessage)) return;

		// Do nothing if the game is inactive
		if (gameStateIsInactive(game.state)) return;

		// Do nothing if the message was posted before the current game started
		if (newMessage.id < game.statusMessage.id) return;

		// Do nothing if the author and tagged users didn't change
		// *and also* the presence of an image didn't change
		if (
			setsEqual(getMessageUsers(oldMessage), getMessageUsers(newMessage))
			&& messageHasImage(oldMessage) === messageHasImage(newMessage)
		) return;

		// Trigger a full recount
		console.log(`A message from ${newMessage.author} was edited in such a way that image presence or mentions changed; recounting...`);
		const newState = await recount(game);

		// Persist the list of users disqualified from the round,
		// if the old and new state both support such a list
		if (
			(gameStateIsAwaitingMatch(game.state) || gameStateIsAwaitingNext(game.state))
			&& (gameStateIsAwaitingMatch(newState) || gameStateIsAwaitingNext(newState))
		) {
			newState.disqualifiedFromRound = new Set(game.state.disqualifiedFromRound);
		}

		// Note the changed scores
		const changedScores = getChangedScores(game.state.scores, newState.scores);

		// Update the current game state
		console.log(`Recount finished; updating game state`);
		await updateGameState(game, newState);

		console.log("Finished handling edit");

		// If there is a chat channel, inform users
		if (game.config.chatChannel) {
			game.config.chatChannel.send({
				embeds: [{
					title: "Recount",
					description: `Scores were just recounted in ${game.channel} due to an edited message.`,
					fields: [
						{ ...getScoreChangesEmbedField(changedScores), inline: true },
						{ ...getScoresEmbedField(game, 'brief'), inline: true },
					],
				}],
			});
		}
	});

	// Listen for message deletions
	client.on('messageDelete', async (message) => {
		// Ignore messages sent by this bot
		if (message.author === message.client.user) return;

		// Ignore if the message is one we just deleted
		if (appState.deletedMessageIds.has(message.id)) {
			appState.deletedMessageIds.delete(message.id);
			return;
		}

		// Abort if the message isn't in a regular text channel
		const channel = message.channel;
		if (!channelIsTextChannel(channel)) return;

		// Try to find a game associated with this channel
		const game = getGameOfChannel(channel);

		// Do nothing if the message is in a channel not associated with a game
		if (game == null) return;

		// Do nothing if there was no image
		if (!messageHasImage(message)) return;

		// Do nothing if the game is inactive
		if (gameStateIsInactive(game.state)) return;

		// Do nothing if the message was posted before the current game started
		if (message.id < game.statusMessage.id) return;

		// Trigger a full recount
		console.log(`A message from ${message.author} which contained an image was deleted; recounting...`);
		const newState = await recount(game);

		// Persist the list of users disqualified from the round,
		// if the old and new state both support such a list
		if (
			(gameStateIsAwaitingMatch(game.state) || gameStateIsAwaitingNext(game.state))
			&& (gameStateIsAwaitingMatch(newState) || gameStateIsAwaitingNext(newState))
		) {
			newState.disqualifiedFromRound = new Set(game.state.disqualifiedFromRound);
		}

		// Note the changed scores
		const changedScores = getChangedScores(game.state.scores, newState.scores);

		// Update the current game state
		console.log(`Recount finished; updating game state`);
		await updateGameState(game, newState);

		console.log("Finished handling deletion");

		// If there is a chat channel, inform users
		if (game.config.chatChannel) {
			game.config.chatChannel.send({
				embeds: [{
					title: "Recount",
					description: `Scores were just recounted in ${game.channel} due to a deleted message.`,
					fields: [
						{ ...getScoreChangesEmbedField(changedScores), inline: true },
						{ ...getScoresEmbedField(game, 'brief'), inline: true },
					],
				}],
			});
		}
	});

	// Listen for bulk deletions
	client.on('messageDeleteBulk', async (messages) => {
		const affectedGames = new Set<Game>();

		for (const message of messages.values()) {
			// Ignore messages sent by this bot
			if (message.author === message.client.user) continue;

			// Ignore if the message is one we just deleted
			if (appState.deletedMessageIds.has(message.id)) {
				appState.deletedMessageIds.delete(message.id);
				continue;
			}

			// Ignore if the message isn't in a regular text channel
			const channel = message.channel;
			if (!channelIsTextChannel(channel)) continue;

			// Try to find a game associated with this channel
			const game = getGameOfChannel(channel);

			// Do nothing if the message is in a channel not associated with a game
			if (game == null) continue;

			// Do nothing if there was no image
			if (!messageHasImage(message)) continue;

			// Do nothing if the game is inactive
			if (gameStateIsInactive(game.state)) return;

			// Do nothing if the message was posted before the current game started
			if (message.id < game.statusMessage.id) return;

			// Add this game to the set of those affected
			affectedGames.add(game);
		}

		// For each affected game, trigger a full recount and update the game state
		await Promise.all([...affectedGames].map(async (game) => {
			console.log(`At least one message in ${game.channel} which contained an image was deleted; recounting...`);
			const newState = await recount(game);

			// Persist the list of users disqualified from the round,
			// if the old and new state both support such a list
			if (
				(gameStateIsAwaitingMatch(game.state) || gameStateIsAwaitingNext(game.state))
				&& (gameStateIsAwaitingMatch(newState) || gameStateIsAwaitingNext(newState))
			) {
				newState.disqualifiedFromRound = new Set(game.state.disqualifiedFromRound);
			}

			// Note the changed scores
			const changedScores = getChangedScores(game.state.scores, newState.scores);

			// Update the current game state
			console.log(`Recount for ${game.channel} finished; updating game state`);
			await updateGameState(game, newState);

			// If there is a chat channel, inform users
			if (game.config.chatChannel) {
				game.config.chatChannel.send({
					embeds: [{
						title: "Recount",
						description: `Scores were just recounted in ${game.channel} due to one or more deleted messages.`,
						fields: [
							{ ...getScoreChangesEmbedField(changedScores), inline: true },
							{ ...getScoresEmbedField(game, 'brief'), inline: true },
						],
					}],
				});
			}
		}));
		console.log("Finished handling bulk deletion");
	});

	// Handle interactions
	client.on('interactionCreate', async (interaction) => {
		// Only handle slash commands
		if (!interaction.isCommand()) return;

		// Look up this command
		const command = commands.find((command) => command.description.name === interaction.commandName);
		if (command == null) {
			console.warn(`Unknown slash command "${interaction.commandName}"; ignoring`);
			return;
		}

		// Retrieve the relevant channel
		let channel: TextChannel;
		try {
			channel = getValidChannel(interaction);
		} catch (error) {
			if (!(error instanceof NoTextChannelError)) throw error;
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: error.message,
				}],
				ephemeral: true,
			});
			return;
		}

		// Retrieve the associated game if possible
		const game = getGameOfChannel(channel);

		// Abort if no game was found but it is required
		if (command.requireGame && game == null) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `The channel ${channel} doesn't have a tag game associated.`,
				}],
				ephemeral: true,
			});
			return;
		}

		// Check for permission if appropriate
		try {
			switch (command.permissions) {
				case 'judge':
					if (!isAdminOrTagJudge(interaction, game)) {
						await interaction.reply({
							embeds: [{
								title: "Error",
								description: "This can only be done by a server admin or a tag judge for this game.",
							}],
							ephemeral: true,
						});
						return;
					}
					break;
				case 'admin':
					if (!isAdmin(interaction)) {
						await interaction.reply({
							embeds: [{
								title: "Error",
								description: "This can only be done by a server admin.",
							}],
							ephemeral: true,
						});
						return;
					}
					break;
			}
		} catch (error) {
			if (!(error instanceof ProblemCheckingPermissionsError)) throw error;
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: error.message,
				}],
				ephemeral: true,
			});
			return;
		}

		// Run the command handler
		await command.handler(interaction, channel, game);
	});

	// Set activity status
	client.user.setPresence({ activities: [{ name: "tag", type: 'WATCHING' }], status: 'online' });
});

/**
 * Startup function.
 */
async function start() {
	// Log in; this triggers other logic when the ready signal is retrieved
	await client.login(process.env.DISCORD_TOKEN);

	// Set up graceful shutdown
	async function shutdown() {
		console.log("Signal to shut down received.");
		if (finishedRestoring) {
			console.log("Persisting state...");
			await persistToDisk();
			console.log("Done");
		} else {
			console.log("Not persisting state since we didn't finish restoring.");
		}
		console.log("Logging out of Discord");
		await client.destroy();
		console.log("Done");
		process.exit(0);
	}
	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);
}

start();
