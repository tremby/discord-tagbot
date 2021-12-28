import { SlashCommandBuilder } from '@discordjs/builders';

import { updateGameState, getStatusEmbedField, gameStateIsArchived } from '../lib/game-state';
import { formatScores } from '../lib/scoring';

const commandSpec: SlashCommandSpec = {
	permissions: 'judge',
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-archive-channel')
		.setDescription("Mark the tag game in this channel as finished."),


	handler: async (interaction, channel, game) => {
		// Handle channel which was already archived
		if (gameStateIsArchived(game.state)) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `The tag game in ${channel} is already archived.`,
					fields: [
						getStatusEmbedField(game),
					],
				}],
				ephemeral: true,
			});
			return;
		}

		// Update game state
		await updateGameState(game, {
			status: 'archived',
			scores: game.state.scores,
		});

		// Announce in chat channel
		if (game.config.chatChannel) {
			await game.config.chatChannel.send({
				embeds: [{
					title: "Tag game over",
					description: `The tag game in ${game.channel} is over!`,
					fields: [
						{
							name: "Top scores",
							value: formatScores(game.state.scores, 3),
						},
						...(game.statusMessage == null ? [] : [
							{
								name: "Full details",
								value: `[See pinned status post](${game.statusMessage.url})`,
							},
						]),
					],
				}],
			});
		}

		// Respond to user
		await interaction.reply({
			embeds: [{
				title: "Tag game archived",
				description: `Tag game in ${channel} has been archived.`,
				fields: [
					getStatusEmbedField(game),
				],
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
