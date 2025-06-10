import { MessageFlags } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import { persist } from '../lib/state';
import { pluralize } from '../lib/string';
import { updateGameStatusMessage } from '../lib/game-state';
import { getConfigEmbedFields } from '../lib/config';
import { setTimers, clearTimers } from '../lib/timers';

const commandDescription = new SlashCommandBuilder()
	.setName('tag-time-limit')
	.setDescription("Manage the time limit between a match being posted and the next tag being posted.");

commandDescription.addSubcommand((sc) => sc
	.setName('set')
	.setDescription("Set the time limit for the next tag to be posted.")
	.addIntegerOption((option) =>
		option.setName('time-limit')
		.setDescription("Time limit in minutes.")
		.setRequired(true)
	)
);

commandDescription.addSubcommand((sc) => sc
	.setName('clear')
	.setDescription("Remove the time limit between a match and the next tag.")
);

const commandSpec: SlashCommandSpec = {
	permissions: 'judge',
	requireGame: true,

	description: commandDescription,

	handler: async (interaction, channel, game) => {
		if (game == null) throw new Error("time-limit commands should always have game set");

		let newTimeLimitInMinutes: number | null;

		switch (interaction.options.getSubcommand()) {
			case 'set':
				newTimeLimitInMinutes = interaction.options.getInteger('time-limit');

				if (newTimeLimitInMinutes == null) {
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: "Time limit was not specified.",
							fields: getConfigEmbedFields(game.config),
						}],
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				if (newTimeLimitInMinutes <= 0) {
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: "Time limit must be positive.",
							fields: getConfigEmbedFields(game.config),
						}],
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				break;

			case 'clear':
				newTimeLimitInMinutes = 0;
				break;

			default:
				await interaction.reply({
					embeds: [{
						title: "Error",
						description: "Unknown subcommand; expected `set` or `clear`.",
						fields: getConfigEmbedFields(game.config),
					}],
					flags: MessageFlags.Ephemeral,
				});
				return;
		}

		// Inform the user this may take time
		const deferralPromise = interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

		// Save the change
		persist();

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
