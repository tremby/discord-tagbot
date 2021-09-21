import { SlashCommandBuilder } from '@discordjs/builders';

import { getConfigEmbedFields } from '../lib/config';
import { formatScores } from '../lib/scoring';

const commandSpec: SlashCommandSpec = {
	permissions: null,
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-show-config')
		.setDescription("Show the configuration for a tag game.")
		.addChannelOption((option) =>
			option.setName('game-channel')
			.setDescription("Channel of the tag game (this channel if not set).")
			.setRequired(false)
		),

	handler: async (interaction, channel, game) => {
		// Reply with config
		await interaction.reply({
			embeds: [{
				title: "Configuration report",
				description: `This is the current configuration for tag game in ${channel}.`,
				fields: getConfigEmbedFields(game.config),
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
