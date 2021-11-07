import type { CommandInteraction, Role, TextChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import {
	gameStateIsAwaitingNext,
	gameStateIsAwaitingMatch,
	getExcludedPlayersEmbedField,
	getStatusEmbedField,
} from '../lib/game-state';

const commandSpec: SlashCommandSpec = {
	permissions: 'judge',
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-excluded-clear')
		.setDescription("Clear the list of players banned from the current round")
		.addChannelOption((option) =>
			option.setName('game-channel')
			.setDescription("Channel in which to clear the list (this channel if not set).")
			.setRequired(false)
		),

	handler: async (interaction, channel, game) => {
		// Get the specified role
		const user = interaction.options.getUser('user');

		// Handle the case where the current game state
		// cannot have a list of excluded users
		if (!gameStateIsAwaitingNext(game.state) && !gameStateIsAwaitingMatch(game.state)) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `Only games in the states of awaiting next tag or awaiting match can have lists of excluded users. The game in ${channel} is not in either of these states.`,
					fields: [getStatusEmbedField(game)],
				}],
				ephemeral: true,
			});
			return;
		}

		// Handle the case where the list is already empty
		if (game.state.excludedFromRound.size === 0) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `No users are excluded from the current round in ${channel}.`,
					fields: [getExcludedPlayersEmbedField(game.state.excludedFromRound)],
				}],
				ephemeral: true,
			});
			return;
		}

		// Remove all players from the list
		game.state.excludedFromRound.clear();

		// Respond to user
		await interaction.reply({
			embeds: [{
				title: "Current round player exclusion list updated",
				description: `All players removed from the list of players excluded from the current round in ${channel}.`,
				fields: [getExcludedPlayersEmbedField(game.state.excludedFromRound)],
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
