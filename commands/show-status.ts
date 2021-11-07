import { SlashCommandBuilder } from '@discordjs/builders';

import { getStatusEmbedField, getDisqualifiedPlayersEmbedField } from '../lib/game-state';
import { getScoresEmbedField } from '../lib/scoring';

const commandSpec: SlashCommandSpec = {
	permissions: null,
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-show-status')
		.setDescription("Show the current status.")
		.addChannelOption((option) =>
			option.setName('game-channel')
			.setDescription("Channel of the tag game (this channel if not set).")
			.setRequired(false)
		),

	handler: async (interaction, channel, game) => {
		// Reply to user with status
		await interaction.reply({
			embeds: [{
				title: "Tag game status",
				description: `This is the current game status in ${channel}. See the [pinned status post](${game.statusMessage.url}) for the full list of scores.`,
				fields: [
					getStatusEmbedField(game),
					getScoresEmbedField(game, 'brief'),
					getDisqualifiedPlayersEmbedField(game) ?? [],
				].flat(),
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
