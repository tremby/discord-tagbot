import type { CommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import appState, { persist } from '../lib/state';
import { getDefaultConfig, getConfigEmbedFields } from '../lib/config';
import { getStatusEmbedField } from '../lib/game-state';
import { getPermissionsEmbedField } from '../lib/permissions';

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

		// Set up the initial game object
		const game: Game = {
			channel,
			config: getDefaultConfig(),
			statusMessage: null,
			state: { status: 'inactive' },
		};

		// Log the interaction
		console.log(`Init command run in channel ${channel} on server ${channel.guild.id} by user ${interaction.member?.user.id} (${interaction.member?.user.username})`);

		// Register the game
		appState.games.add(game);
		persist();

		// Respond to user
		await interaction.reply({
			embeds: [{
				title: "New tag game",
				description: `Tag game initialized in ${channel}. You may now want to configure and start it.`,
				fields: [
					...getConfigEmbedFields(game.config),
					getStatusEmbedField(game),
					await getPermissionsEmbedField(game),
				].flat(),
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
