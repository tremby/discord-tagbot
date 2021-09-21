import { SlashCommandBuilder } from '@discordjs/builders';
import { Constants } from 'discord.js';

import appState, { persistToDisk } from '../lib/state';
import { getStatusMessage } from '../lib/channel';

const commandSpec: SlashCommandSpec = {
	permissions: 'admin',
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-remove-channel')
		.setDescription("Make the bot forget a particular channel.")
		.addChannelOption((option) =>
			option.setName('game-channel')
			.setDescription("Channel to forget (this channel if not set).")
			.setRequired(false)
		),

	handler: async (interaction, channel, game) => {
		// Clean up the pinned status message
		if (game.statusMessage != null) {
			try {
				await game.statusMessage.delete();
			} catch (error) {
				if (error.code === Constants.APIErrors.UNKNOWN_MESSAGE) {
					// That's fine; maybe an admin already deleted it
				} else {
					throw error;
				}
			}
		}

		// Unregister game
		appState.games.delete(game);
		persistToDisk();

		// Respond to the user
		await interaction.reply({
			embeds: [{
				title: "Game unregistered",
				description: `The channel ${channel} is no longer being tracked as a tag game.`,
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
