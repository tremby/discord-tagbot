import { SlashCommandBuilder } from '@discordjs/builders';

import { getConfigEmbedFields } from '../lib/config';

const commandSpec: SlashCommandSpec = {
	permissions: 'judge',
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-clear-chat-channel')
		.setDescription("Unassociate the chat channel from the tag game."),

	handler: async (interaction, channel, game) => {
		// Handle the case where there wasn't a chat channel
		if (game.config.chatChannel == null) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `There was no chat channel associated with the tag game in ${channel}.`,
					fields: getConfigEmbedFields(game.config),
				}],
				ephemeral: true,
			});
			return;
		}

		// Unregister the chat channel
		game.config = {
			...game.config,
			chatChannel: null,
		};

		// Respond to the user
		await interaction.reply({
			embeds: [{
				title: "Configuration updated",
				description: `Chat channel for the tag game in ${channel} has been cleared.`,
				fields: getConfigEmbedFields(game.config),
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
