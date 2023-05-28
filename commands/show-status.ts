import { SlashCommandBuilder } from '@discordjs/builders';

import {
	gameStateIsInactive,
	getStatusEmbedField,
	getDisqualifiedPlayersEmbedField,
} from '../lib/game-state';
import { getScoresEmbedFields } from '../lib/scoring';

const commandSpec: SlashCommandSpec = {
	permissions: null,
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-show-status')
		.setDescription("Show the current status for the tag game in this channel."),

	handler: async (interaction, channel, game) => {
		if (game == null) throw new Error("show-status command should always have game set");

		// Reply to user with status
		await interaction.reply({
			embeds: [{
				title: "Tag game status",
				description: `This is the current game status in ${channel}.`,
				fields: [
					getStatusEmbedField(game),
					gameStateIsInactive(game.state) ? [] : getScoresEmbedFields(game, 'brief'),
					getDisqualifiedPlayersEmbedField(game) ?? [],
				].flat(),
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
