import { SlashCommandBuilder } from '@discordjs/builders';

import {
	gameStateIsInactive,
	getStatusEmbedField,
	getDisqualifiedPlayersEmbedField,
} from '../lib/game-state';
import { getScoresEmbedField } from '../lib/scoring';

const commandSpec: SlashCommandSpec = {
	permissions: null,
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-show-status')
		.setDescription("Show the current status for the tag game in this channel."),

	handler: async (interaction, channel, game) => {
		// Reply to user with status
		await interaction.reply({
			embeds: [{
				title: "Tag game status",
				description: `This is the current game status in ${channel}. See the [pinned status post](${game.statusMessage.url}) for the full list of scores.`,
				fields: [
					getStatusEmbedField(game),
					gameStateIsInactive(game.state) ? [] : getScoresEmbedField(game, 'brief'),
					getDisqualifiedPlayersEmbedField(game) ?? [],
				].flat(),
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
