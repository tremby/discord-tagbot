import type { CommandInteraction, Role, TextChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import {
	gameStateIsAwaitingNext,
	gameStateIsAwaitingMatch,
	getDisqualifiedPlayersEmbedField,
	getStatusEmbedField,
} from '../lib/game-state';

const commandSpec: SlashCommandSpec = {
	permissions: 'judge',
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-disqualified-add')
		.setDescription("Add a player to those disqualified from the current round")
		.addUserOption((option) =>
			option.setName('user')
			.setDescription("User to exclude.")
			.setRequired(true)
		)
		.addChannelOption((option) =>
			option.setName('game-channel')
			.setDescription("Channel in which to add the player to the list (this channel if not set).")
			.setRequired(false)
		),

	handler: async (interaction, channel, game) => {
		// Get the specified role
		const user = interaction.options.getUser('user');

		// Handle the case where the current game state
		// cannot have a list of disqualified users
		if (!gameStateIsAwaitingNext(game.state) && !gameStateIsAwaitingMatch(game.state)) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `Only games in the states of awaiting next tag or awaiting match can have lists of disqualified users. The game in ${channel} is not in either of these states.`,
					fields: [getStatusEmbedField(game)],
				}],
				ephemeral: true,
			});
			return;
		}

		// Handle the case where the user is already in the exclusion list
		if (game.state.disqualifiedFromRound.has(user)) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `${user} is already disqualified from the current round in ${channel}.`,
					fields: [getDisqualifiedPlayersEmbedField(game.state.disqualifiedFromRound)],
				}],
				ephemeral: true,
			});
			return;
		}

		// Add the player to the list
		game.state.disqualifiedFromRound.add(user);

		// Respond to user
		await interaction.reply({
			embeds: [{
				title: "Current round player exclusion list updated",
				description: `${user} added to the list of players disqualified from the current round in ${channel}.`,
				fields: [getDisqualifiedPlayersEmbedField(game.state.disqualifiedFromRound)],
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
