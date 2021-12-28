import type { TextChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import { getValidChannel, NoTextChannelError } from './lib/helpers';
import { getConfigEmbedFields } from '../lib/config';

const commandSpec: SlashCommandSpec = {
	permissions: 'judge',
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-set-chat-channel')
		.setDescription("Set a chat channel associated with the tag game in this channel.")
		.addChannelOption((option) =>
			option.setName('chat-channel')
			.setDescription("Channel used for chat about this tag game.")
			.setRequired(true)
		),

	handler: async (interaction, channel, game) => {
		// Check input
		let chatChannel: TextChannel;
		try {
			chatChannel = getValidChannel(interaction, 'chat-channel');
		} catch (error) {
			if (!(error instanceof NoTextChannelError)) throw error;
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: error.message,
					fields: getConfigEmbedFields(game.config),
				}],
				ephemeral: true,
			});
			return;
		}
		if (chatChannel === channel) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `The chat channel cannot be set to the same channel as the game channel.`,
					fields: getConfigEmbedFields(game.config),
				}],
				ephemeral: true,
			});
			return;
		}

		// Register the chat channel
		game.config = {
			...game.config,
			chatChannel,
		};

		// Respond to the user
		await interaction.reply({
			embeds: [{
				title: "Configuration updated",
				description: `Chat channel for the tag game in ${channel} is updated to ${chatChannel}.`,
				fields: getConfigEmbedFields(game.config),
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
