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
		.setName('tag-excluded-remove')
		.setDescription("Remove a player from those banned from the current round")
		.addUserOption((option) =>
			option.setName('user')
			.setDescription("User to unban.")
			.setRequired(true)
		)
		.addChannelOption((option) =>
			option.setName('game-channel')
			.setDescription("Channel in which to remove the player from the list (this channel if not set).")
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

		// Handle the case where the user is not in the exclusion list
		if (!game.state.excludedFromRound.has(user)) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `${user} is not excluded from the current round in ${channel}.`,
					fields: [getExcludedPlayersEmbedField(game.state.excludedFromRound)],
				}],
				ephemeral: true,
			});
			return;
		}

		// Remove the player from the list
		game.state.excludedFromRound.delete(user);

		// Respond to user
		await interaction.reply({
			embeds: [{
				title: "Current round player exclusion list updated",
				description: `${user} removed from the list of players excluded from the current round in ${channel}.`,
				fields: [getExcludedPlayersEmbedField(game.state.excludedFromRound)],
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
