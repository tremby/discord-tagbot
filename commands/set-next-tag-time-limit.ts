import { SlashCommandBuilder } from '@discordjs/builders';

import { pluralize } from '../lib/string';
import { updateGameStatusMessage } from '../lib/game-state';
import { getConfigEmbedFields } from '../lib/config';
import { setTimers, clearTimers } from '../lib/timers';

const commandSpec: SlashCommandSpec = {
	permissions: 'judge',
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-set-next-tag-time-limit')
		.setDescription("Set the time limit for the next tag to be posted. Only affects future tags; no scores will change.")
		.addIntegerOption((option) =>
			option.setName('time-limit')
			.setDescription("Time limit in minutes, or 0 for no limit.")
			.setRequired(true)
		),

	handler: async (interaction, channel, game) => {
		// Check input
		const newTimeLimitInMinutes = interaction.options.getInteger('time-limit');
		if (newTimeLimitInMinutes < 0) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: "Time limit can't be negative.",
					fields: getConfigEmbedFields(game.config),
				}],
				ephemeral: true,
			});
			return;
		}

		// Inform the user this may take time
		const deferralPromise = interaction.deferReply({ ephemeral: true });

		// Update configuration
		const newTimeLimitInMs = newTimeLimitInMinutes * 60 * 1e3;
		game.config = {
			...game.config,
			nextTagTimeLimit: newTimeLimitInMinutes === 0 ? null : newTimeLimitInMs,
		};

		// Update game state message
		await updateGameStatusMessage(game);

		// If necessary, restart the reminder timeout
		clearTimers(game);
		setTimers(game, game.state);

		// Respond to the user
		await deferralPromise;
		await interaction.editReply({
			embeds: [{
				title: "Configuration updated",
				description: `Time limit for the next tag in ${channel} has been ${newTimeLimitInMinutes === 0 ? "removed" : `updated to ${newTimeLimitInMinutes} ${pluralize("minute", newTimeLimitInMinutes)}`}, and this will apply from now on.`,
				fields: getConfigEmbedFields(game.config),
			}],
		});
	},
};

export default commandSpec;
