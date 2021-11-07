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
		.setName('tag-disqualified-remove')
		.setDescription("Remove a player from those disqualified from the current round")
		.addUserOption((option) =>
			option.setName('user')
			.setDescription("User to pardon.")
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

		// Handle the case where the user is not in the exclusion list
		if (!game.state.disqualifiedFromRound.has(user)) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `${user} is not disqualified from the current round in ${channel}.`,
					fields: [getDisqualifiedPlayersEmbedField(game)],
				}],
				ephemeral: true,
			});
			return;
		}

		// Remove the player from the list
		game.state.disqualifiedFromRound.delete(user);

		// Respond to user
		await interaction.reply({
			embeds: [{
				title: "Current round player exclusion list updated",
				description: `${user} removed from the list of players disqualified from the current round in ${channel}.`,
				fields: [getDisqualifiedPlayersEmbedField(game)],
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
