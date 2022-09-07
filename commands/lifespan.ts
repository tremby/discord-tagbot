import { SlashCommandBuilder } from '@discordjs/builders';

import { updateGameStatusMessage } from '../lib/game-state';
import { setTimers, clearTimers } from '../lib/timers';
import { getConfigEmbedFields } from '../lib/config';
import { persist } from '../lib/state';

const commandDescription = new SlashCommandBuilder()
	.setName('tag-lifespan')
	.setDescription("Manage the tag game's lifespan");

commandDescription.addSubcommand((sc) => sc
	.setName('period')
	.setDescription("Set the game's period.")
	.addStringOption((option) => option
		.setName('period')
		.setDescription("Period for the game.")
		.setRequired(true)
		.addChoices({ name: 'manual', value: 'manual' })
		.addChoices({ name: 'hour', value: 'hour' })
		.addChoices({ name: 'month', value: 'month' })
	)
);

commandDescription.addSubcommand((sc) => sc
	.setName('auto-restart')
	.setDescription("Configure whether the game will automatically restart at the end of the period.")
	.addBooleanOption((option) => option
		.setName('auto-restart')
		.setDescription("Whether the game will automatically restart.")
		.setRequired(true)
	)
);

commandDescription.addSubcommand((sc) => sc
	.setName('locale')
	.setDescription("Set the locale (time zone) used for timekeeping.")
	.addStringOption((option) =>
		option.setName('locale')
		.setDescription("Locale to use, for example `America/Vancouver`.")
		.setRequired(true)
	)
);

const commandSpec: SlashCommandSpec = {
	permissions: 'admin',
	requireGame: true,

	description: commandDescription,

	handler: async (interaction, channel, game) => {
		if (game == null) throw new Error("lifespan commands should always have game set");

		switch (interaction.options.getSubcommand()) {
			case 'period': {
				// Inform the user this may take time
				const deferralPromise = interaction.deferReply({ ephemeral: true });

				// Get the specified period
				const rawPeriod = interaction.options.getString('period') as 'manual' | 'hour' | 'month';
				const period: Period = rawPeriod === 'manual' ? null : rawPeriod;

				// Set the new configuration
				game.config = {
					...game.config,
					period,
				};

				// Save state
				persist();

				// Update game state message
				await updateGameStatusMessage(game);

				// If necessary, restart the reminder timeout
				clearTimers(game);
				setTimers(game, game.state);

				// Respond to user
				await deferralPromise;
				await interaction.editReply({
					embeds: [{
						title: "Game lifespan updated",
						fields: getConfigEmbedFields(game.config),
					}],
				});

				return;
			}

			case 'auto-restart': {
				// Inform the user this may take time
				const deferralPromise = interaction.deferReply({ ephemeral: true });

				// Get the specified setting
				const autoRestart = interaction.options.getBoolean('auto-restart') ?? false;

				// Set the new configuration
				game.config = {
					...game.config,
					autoRestart,
				};

				// Save state
				persist();

				// Update game state message
				await updateGameStatusMessage(game);

				// Respond to user
				await deferralPromise;
				await interaction.editReply({
					embeds: [{
						title: "Auto-restart option updated",
						description: `The auto-restart option is now ${autoRestart ? "on" : "off"}.`,
						fields: getConfigEmbedFields(game.config),
					}],
				});

				return;
			}

			case 'locale':
				// Inform the user this may take time
				const deferralPromise = interaction.deferReply({ ephemeral: true });

				// Get the specified setting
				const locale = interaction.options.getString('locale');

				if (locale == null) {
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: "Locale was not specified.",
						}],
						ephemeral: true,
					});
					return;
				}

				// Set the new configuration
				game.config = {
					...game.config,
					locale,
				};

				// Save state
				persist();

				// Update game state message
				await updateGameStatusMessage(game);

				// If necessary, restart the reminder timeout
				clearTimers(game);
				setTimers(game, game.state);

				// Respond to user
				await deferralPromise;
				await interaction.editReply({
					embeds: [{
						title: "Locale configuration updated",
						description: `The locale for this game has been updated to ${locale}.`,
						fields: getConfigEmbedFields(game.config),
					}],
				});

				return;
		}
	},
};

export default commandSpec;
