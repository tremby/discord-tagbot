// Load configuration
import dotenv = require('dotenv');
dotenv.config();

import { createClient as createRedisClient } from 'redis';

import { Client as DiscordClient, GatewayIntentBits, TextChannel, ActivityType, PermissionFlagsBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import commands from './commands';
import { ProblemCheckingPermissionsError, NoTextChannelError, isAdmin, isAdminOrTagJudge, getValidChannel } from './commands/lib/helpers';

import version from './lib/version';
import appState, { load, persist, getRedisClient } from './lib/state';
import { channelIsTextChannel, getGameOfChannel } from './lib/channel';
import { handleMessage, recount, getChangedScores, getScoreChangesEmbedField } from './lib/scoring';
import { gameStateIsAwaitingMatch, gameStateIsAwaitingNext, gameStateIsInactive, updateGameState } from './lib/game-state';
import { messageHasImage, getMessageUsers } from './lib/message';
import { setsEqual } from './lib/set';
import { checkPermissionsAndWarn, checkAllPermissionsAndWarn } from './lib/permissions';

console.log(`discord-tagbot ${version}`);

const DEBUG = Boolean(process.env.DEBUG);
function debug(message: string): void {
	if (!DEBUG) return;
	console.log(`[debug] ${message}`);
}
debug("Debug mode on");

// Flag for whether we have finished loading any saved state or not
let finishedRestoring = false;

// Check for configuration
for (const varname of ['DISCORD_TOKEN', 'REDISHOST', 'REDISPORT']) {
	if (!process.env[varname]) {
		console.error(`${varname} must be set`);
		process.exit(1);
	}
}

// Connect to Redis client
getRedisClient().connect();

// Set up Discord client
const discordClient = new DiscordClient({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.MessageContent,
	],
});

// Actions to take on login
discordClient.on('ready', async () => {
	if (discordClient.user == null) throw new Error("Logged in but discordClient.user is null");
	if (discordClient.application == null) throw new Error("Logged in but discordClient.application is null");

	console.log(`Logged in as ${discordClient.user.tag}`);

	// Set activity status
	discordClient.user.setPresence({ status: 'idle' });

	// Load state from disk and hydrate data
	try {
		await load(discordClient);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			// No saved state; nothing needs to be done
			console.log("No saved state");
		} else {
			throw error;
		}
	}
	finishedRestoring = true;

	// Register slash commands
	const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
	console.log("Registering slash commands");
	await rest.put(Routes.applicationCommands(discordClient.application.id), {
		body: commands.map((command) => command.description),
	});
	console.log("...done");

	// Check we have all necessary permissions for all guilds
	checkAllPermissionsAndWarn();

	// Listen for and handle new messages
	discordClient.on('messageCreate', async (message) => {
		// Ignore messages sent by this bot
		if (message.author === message.client.user) {
			debug(`Message ${message.url} was sent by this bot; ignoring`);
			return;
		}

		// Abort if the message isn't in a regular text channel
		const channel = message.channel;
		if (!channelIsTextChannel(channel)) {
			debug(`Message ${message.url} was not in a normal text channel; ignoring`);
			return;
		}

		// Try to find a game associated with this channel
		const game = getGameOfChannel(channel);

		// Do nothing if the message is in a channel not associated with a game
		if (game == null) {
			debug(`Message ${message.url} was not in a game channel; ignoring`);
			return;
		}

		debug(`Message ${message.url} accepted for processing`);

		// Calculate new state from configuration, old state, and message
		const newState = await handleMessage(game, message, 'live');

		// Do nothing if the state didn't change
		if (newState == null) return;

		// Update current game state
		await updateGameState(game, newState);
	});

	// Listen for message edits
	discordClient.on('messageUpdate', async (oldMessage, newMessage) => {
		// Panic if the old and new channels are different
		if (oldMessage.channel !== newMessage.channel) {
			console.error(`Received a messageUpdate event where the old and new messages are in different channels. Ignoring. Old: ${JSON.stringify(oldMessage)}, new: ${JSON.stringify(newMessage)}`);
			// TODO: handle this? Could just recount both channels. But this is
			// probably an impossible situation -- it looks like Discord has no
			// feature to move messages.
			return;
		}

		// Ignore messages sent by this bot
		if (newMessage.author === newMessage.client.user || oldMessage.author === oldMessage.client.user) {
			debug(`Message edit ${oldMessage.url} -> ${newMessage.url} authored by this bot; ignoring`);
			return;
		}

		// Abort if the message isn't in a regular text channel
		const channel = newMessage.channel;
		if (!channelIsTextChannel(channel)) {
			debug(`Message edit ${oldMessage.url} -> ${newMessage.url} not in a normal text channel; ignoring`);
			return;
		}

		// Try to find a game associated with this channel
		const game = getGameOfChannel(channel);

		// Do nothing if the message is in a channel not associated with a game
		if (game == null) {
			debug(`Message edit ${oldMessage.url} -> ${newMessage.url} not in a game channel; ignoring`);
			return;
		}

		// Do nothing if there was no image before or after
		if (!messageHasImage(oldMessage) && !messageHasImage(newMessage)) {
			debug(`Message edit ${oldMessage.url} -> ${newMessage.url} has no image attachment before or after; ignoring`);
			return;
		}

		// Do nothing if the game is inactive
		if (gameStateIsInactive(game.state)) {
			debug(`Message edit ${oldMessage.url} -> ${newMessage.url} is in an inactive game channel; ignoring`);
			return;
		}

		// Do nothing if the message was posted before the current game started
		if (game.statusMessage != null && newMessage.id < game.statusMessage.id) {
			debug(`Message edit ${oldMessage.url} -> ${newMessage.url} is dated before start of current game; ignoring`);
			return;
		}

		// Do nothing if the author and tagged users didn't change
		// *and also* the presence of an image didn't change
		if (
			setsEqual(getMessageUsers(oldMessage), getMessageUsers(newMessage))
			&& messageHasImage(oldMessage) === messageHasImage(newMessage)
		) {
			debug(`Message edit ${oldMessage.url} -> ${newMessage.url} has no pertinent change; ignoring`);
			return;
		}

		debug(`Message edit ${oldMessage.url} -> ${newMessage.url} accepted for processing`);

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
					],
				}],
			});
		}
	});

	// Listen for message deletions
	discordClient.on('messageDelete', async (message) => {
		// Ignore messages sent by this bot
		if (message.author === message.client.user) {
			debug(`Message ${message.url} deleted but it was authored by this bot; ignoring`);
			return;
		}

		// Ignore if the message is one we just deleted
		if (appState.deletedMessageIds.has(message.id)) {
			debug(`Message ${message.url} deleted; this is an action this bot intentionally caused`);
			appState.deletedMessageIds.delete(message.id);
			return;
		}

		// Abort if the message isn't in a regular text channel
		const channel = message.channel;
		if (!channelIsTextChannel(channel)) {
			debug(`Message ${message.url} deleted but it was not in a normal text channel; ignoring`);
			return;
		}

		// Try to find a game associated with this channel
		const game = getGameOfChannel(channel);

		// Do nothing if the message is in a channel not associated with a game
		if (game == null) {
			debug(`Message ${message.url} deleted but it was not in a game channel; ignoring`);
			return;
		}

		// Do nothing if there was no image
		if (!messageHasImage(message)) {
			debug(`Message ${message.url} deleted but it had no image; ignoring`);
			return;
		}

		// Do nothing if the game is inactive
		if (gameStateIsInactive(game.state)) {
			debug(`Message ${message.url} deleted but from a channel with an inactive game; ignoring`);
			return;
		}

		// Do nothing if the message was posted before the current game started
		if (game.statusMessage != null && message.id < game.statusMessage.id) {
			debug(`Message ${message.url} deleted but it was dated before the current game started; ignoring`);
			return;
		}

		debug(`Message ${message.url} deletion accepted for processing`);

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
					],
				}],
			});
		}
	});

	// Listen for bulk deletions
	discordClient.on('messageDeleteBulk', async (messages) => {
		const affectedGames = new Set<Game>();

		debug("Bulk deletion notification received");

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
			if (game.statusMessage != null && message.id < game.statusMessage.id) return;

			// Add this game to the set of those affected
			affectedGames.add(game);
		}

		if (affectedGames.size === 0) debug("None of the deletions affect active games");

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
						],
					}],
				});
			}
		}));
		console.log("Finished handling bulk deletion");
	});

	// Listen for updates to roles the bot is a member of
	discordClient.on('roleUpdate', async (oldRole, role) => {
		const guild = role.guild;
		const bot = guild.members.me;
		if (!bot) return;

		// Do nothing if we're not affected by the changed role
		if (!bot.roles.cache.has(role.id)) return;

		// Do nothing if the permissions didn't change
		if (oldRole.permissions.bitfield === role.permissions.bitfield) return;

		debug("Noticed that permissions of a role that affects us changed. Checking if we have all necessary permissions.");
		const perms = await checkPermissionsAndWarn(guild, "full");
	});

	// Handle interactions
	discordClient.on('interactionCreate', async (interaction) => {
		// Only handle slash commands
		if (!interaction.isCommand()) {
			debug(`Interaction ${interaction} is not a command; ignoring`);
			return;
		}
		if (!interaction.isChatInputCommand()) {
			debug(`Interaction ${interaction} is not a chat input command; ignoring`);
			return;
		}

		// Look up this command
		const command = commands.find((command) => command.description.name === interaction.commandName);
		if (command == null) {
			console.warn(`Unknown slash command "${interaction.commandName}"; ignoring`);
			return;
		}

		debug(`Interaction ${interaction} accepted for processing`);

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
					if (!isAdminOrTagJudge(interaction, game!)) {
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
	discordClient.user.setPresence({ activities: [{ name: "tag", type: ActivityType.Watching }], status: 'online' });

	// Logging to aid debugging an issue where the bot will stop receiving
	// events after having been running a month or so
	discordClient.on("debug", (info) => {
		console.log(`Received debug event: ${info}`);
	});
	discordClient.on("shardDisconnect", (event, shardId) => {
		console.warn(`Received shardDisconnect event, shard ID ${shardId}`, event);
	});
	discordClient.on("shardError", (event, shardId) => {
		console.error(`Received shardError event, shard ID ${shardId}`, event);
	});
	discordClient.on("shardReady", (shardId, unavailableGuilds) => {
		console.log(`Received shardReady event, shard ID ${shardId}`, unavailableGuilds);
	});
	discordClient.on("shardReconnecting", (shardId) => {
		console.log(`Received shardReconnecting event, shard ID ${shardId}`);
	});
	discordClient.on("shardResume", (shardId, replayedEvents) => {
		console.log(`Received shardResume event, shard ID ${shardId}`, replayedEvents, "replayed events");
	});
	setInterval(() => {
		console.log(`Websocket ping: ${discordClient.ws.ping}ms`);
	}, 60e3);
});

/**
 * Startup function.
 */
async function start() {
	// Log in; this triggers other logic when the ready signal is retrieved
	await discordClient.login(process.env.DISCORD_TOKEN);

	// Set up graceful shutdown
	async function shutdown() {
		console.log("Signal to shut down received.");
		if (finishedRestoring) {
			console.log("Persisting state...");
			await persist();
			console.log("Done");
		} else {
			console.log("Not persisting state since we didn't finish restoring.");
		}
		console.log("Logging out of Discord");
		await discordClient.destroy();
		console.log("Done");
		process.exit(0);
	}
	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);
}

start();
