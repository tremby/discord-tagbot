import { SlashCommandBuilder } from '@discordjs/builders';

import { getConfigEmbedFields } from '../lib/config';
import { formatScores } from '../lib/scoring';

const commandSpec: SlashCommandSpec = {
	permissions: null,
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-show-config')
		.setDescription("Show the configuration for the tag game in this channel."),

	handler: async (interaction, channel, game) => {
		if (game == null) throw new Error("show-config command should always have game set");

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
