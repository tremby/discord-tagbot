import { SlashCommandBuilder } from '@discordjs/builders';

import { getConfigEmbedFields } from '../lib/config';
import { formatScores } from '../lib/scoring';

const commandDescription = new SlashCommandBuilder()
	.setName('tag-config')
	.setDescription("Manage the configuration of the tag game in this channel.");

commandDescription.addSubcommand((sc) => sc
	.setName('show')
	.setDescription("Show the configuration for the tag game in this channel.")
);

const commandSpec: SlashCommandSpec = {
	permissions: null,
	requireGame: true,

	description: commandDescription,

	handler: async (interaction, channel, game) => {
		switch (interaction.options.getSubcommand()) {
			case 'show':
				// Reply with config
				await interaction.reply({
					embeds: [{
						title: "Configuration report",
						description: `This is the current configuration for tag game in ${channel}.`,
						fields: getConfigEmbedFields(game.config),
					}],
					ephemeral: true,
				});
		}
	},
};

export default commandSpec;
