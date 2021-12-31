import { SlashCommandBuilder } from '@discordjs/builders';

import { recount, getScoresEmbedField, getChangedScores, getScoreChangesEmbedField } from '../lib/scoring';
import { updateGameState, getStatusEmbedField, gameStateIsInactive } from '../lib/game-state';
import { getConfigEmbedFields } from '../lib/config';

const commandSpec: SlashCommandSpec = {
	permissions: 'judge',
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-recount')
		.setDescription("Perform a recount of the current game."),

	handler: async (interaction, channel, game) => {
		// If the game is inactive, do nothing
		if (gameStateIsInactive(game.state)) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `Game in ${channel} is **inactive** so doesn't have anything to recount.`,
					fields: [
						getStatusEmbedField(game),
					],
				}],
				ephemeral: true,
			});
			return;
		}

		// Inform the user that this could take time
		const deferralPromise = interaction.deferReply({ ephemeral: true });

		// Hold on to the old scores
		const oldScores = game.state.scores;

		// Perform the recount
		const state = await recount(game);

		// Did any scores change?
		const changedScores = getChangedScores(oldScores, state.scores);

		// Update the game state
		await updateGameState(game, state);

		// Respond to the user
		await deferralPromise;
		await interaction.editReply({
			embeds: [{
				title: "Recount results",
				description: `Game in ${channel} recounted.`,
				fields: [
					...getConfigEmbedFields(game.config),
					getStatusEmbedField(game),
					getScoreChangesEmbedField(changedScores),
					getScoresEmbedField(game, 'brief'),
				],
			}],
		});

		// If any scores changed, announce it in the chat channel
		if (changedScores.size > 0 && game.config.chatChannel) {
			game.config.chatChannel.send({
				embeds: [{
					title: "Recount",
					description: `Scores were just recounted in ${game.channel} due to a manual trigger.`,
					fields: [
						{ ...getScoreChangesEmbedField(changedScores), inline: true },
						{ ...getScoresEmbedField(game, 'brief'), inline: true },
					],
				}],
			});
		}
	},
};

export default commandSpec;
