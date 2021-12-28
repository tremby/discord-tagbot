import type { CommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import appState, { persistToDisk } from '../lib/state';
import { getDefaultConfig, getConfigEmbedFields } from '../lib/config';
import { recount, getScoresEmbedField } from '../lib/scoring';
import { updateGameStatusMessage, getStatusEmbedField } from '../lib/game-state';
import { getStatusMessage } from '../lib/channel';

const commandSpec: SlashCommandSpec = {
	permissions: 'admin',
	requireGame: false,

	description: new SlashCommandBuilder()
		.setName('tag-init')
		.setDescription("Inform the bot that this channel hosts a tag game."),

	handler: async function(interaction, channel, existingGame) {
		// Abort if this channel already has a tag game
		if (existingGame != null) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `There is already a tag game running in ${channel}.`,
					fields: [
						getStatusEmbedField(existingGame),
					],
				}],
				ephemeral: true,
			});
			return;
		}

		// We might take a bit of time counting scores so warn the user
		const deferralPromise = interaction.deferReply({ ephemeral: true });

		// Set up some initial configuration
		const config = getDefaultConfig();
		const partialGame = {
			channel,
			config,
			statusMessage: null,
		};

		// Get the info we need
		const state = await recount(partialGame);

		// A more complete game object
		const game: Game = {
			...partialGame,
			state,
			statusMessage: null,
		};

		// Update or add game status message
		await updateGameStatusMessage(game);

		// Register the game
		appState.games.add(game);
		persistToDisk();

		// Respond to user
		await deferralPromise;
		await interaction.editReply({
			embeds: [{
				title: "New tag game",
				description: `Tag game initialized in ${channel}.`,
				fields: [
					...getConfigEmbedFields(config),
					getStatusEmbedField(game),
					getScoresEmbedField(game, 'brief'),
				],
			}],
		});
	},
};

export default commandSpec;
