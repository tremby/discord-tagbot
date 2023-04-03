import { SlashCommandBuilder } from '@discordjs/builders';

import { updateGameStatusMessage } from '../lib/game-state';
import { setTimers, clearTimers } from '../lib/timers';
import { getConfigEmbedFields } from '../lib/config';
import { persist } from '../lib/state';

const commandDescription = new SlashCommandBuilder()
	.setName('tag-ranking-strategy')
	.setDescription("Manage the tag game's ranking strategy");

commandDescription.addSubcommand((sc) => sc
	.setName('set')
	.setDescription("Set the game's ranking strategy.")
	.addStringOption((option) => option
		.setName('strategy')
		.setDescription("Ranking strategy to use.")
		.setRequired(true)
		.addChoices({ name: "Standard competition ranking", value: 'standardCompetition' })
		.addChoices({ name: "Modified competition ranking", value: 'modifiedCompetition' })
		.addChoices({ name: "Dense ranking", value: 'dense' })
	)
);

function stringIsRankingStrategy(str: string): str is RankingStrategy {
	switch (str) {
		case 'standardCompetition':
		case 'modifiedCompetition':
		case 'dense':
			return true;
	}
	return false;
}

const commandSpec: SlashCommandSpec = {
	permissions: 'admin',
	requireGame: true,

	description: commandDescription,

	handler: async (interaction, channel, game) => {
		if (game == null) throw new Error("ranking strategy commands should always have game set");

		switch (interaction.options.getSubcommand()) {
			case 'set': {
				// Inform the user this may take time
				const deferralPromise = interaction.deferReply({ ephemeral: true });

				// Get the specified strategy
				const rankingStrategy = interaction.options.getString('strategy');

				if (rankingStrategy == null) {
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: "Strategy was not specified.",
						}],
						ephemeral: true,
					});
					return;
				}

				if (!stringIsRankingStrategy(rankingStrategy)) {
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: "Unknown strategy.",
						}],
						ephemeral: true,
					});
					return;
				}

				// Set the new configuration
				game.config = {
					...game.config,
					rankingStrategy,
				};

				// Save state
				persist();

				// Update game state message
				await updateGameStatusMessage(game);

				// Respond to user
				await deferralPromise;
				await interaction.editReply({
					embeds: [{
						title: "Ranking strategy updated",
						fields: getConfigEmbedFields(game.config),
					}],
				});

				return;
			}
		}
	},
};

export default commandSpec;
