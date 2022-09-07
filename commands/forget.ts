import { SlashCommandBuilder } from '@discordjs/builders';
import { Constants } from 'discord.js';

import appState, { persist } from '../lib/state';
import { clearTimers } from '../lib/timers';

const commandSpec: SlashCommandSpec = {
	permissions: 'admin',
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-forget')
		.setDescription("Make the bot forget this channel."),

	handler: async (interaction, channel, game) => {
		if (game == null) throw new Error("forget command should always have game set");

		// Stop any timers
		clearTimers(game);

		// Unregister game
		appState.games.delete(game);
		persist();

		// Respond to the user
		await interaction.reply({
			embeds: [{
				title: "Game unregistered",
				description: `The channel ${channel} is no longer being tracked as a tag game. You may or may not wish to tidy up any posts made by the bot.`,
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
