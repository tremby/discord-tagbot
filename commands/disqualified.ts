import type { CommandInteraction, Role, TextChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import {
	gameStateIsAwaitingNext,
	gameStateIsAwaitingMatch,
	getDisqualifiedPlayersEmbedField,
	getStatusEmbedField,
} from '../lib/game-state';

const commandDescription = new SlashCommandBuilder()
	.setName('tag-disqualified')
	.setDescription("Manage the current round's disqualifications");

commandDescription.addSubcommand((sc) => sc
	.setName('add')
	.setDescription("Add a player to those disqualified from the current round")
	.addUserOption((option) =>
		option.setName('user')
		.setDescription("User to exclude.")
		.setRequired(true)
	)
);

commandDescription.addSubcommand((sc) => sc
	.setName('remove')
	.setDescription("Remove a player from those disqualified from the current round")
	.addUserOption((option) =>
		option.setName('user')
		.setDescription("User to pardon.")
		.setRequired(true)
	)
);

commandDescription.addSubcommand((sc) => sc
	.setName('clear')
	.setDescription("Clear the list of players disqualified from the current round")
);

const commandSpec: SlashCommandSpec = {
	permissions: 'judge',
	requireGame: true,

	description: commandDescription,

	handler: async (interaction, channel, game) => {
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

		switch (interaction.options.getSubcommand()) {
			case 'add': {
				// Get the specified user
				const user = interaction.options.getUser('user');

				// Handle the case where the user is already in the exclusion list
				if (game.state.disqualifiedFromRound.has(user)) {
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: `${user} is already disqualified from the current round in ${channel}.`,
							fields: [getDisqualifiedPlayersEmbedField(game)],
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
						fields: [getDisqualifiedPlayersEmbedField(game)],
					}],
					ephemeral: true,
				});

				return;
			}

			case 'remove': {
				// Get the specified user
				const user = interaction.options.getUser('user');

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

				return;
			}

			case 'clear':
				// Handle the case where the list is already empty
				if (game.state.disqualifiedFromRound.size === 0) {
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: `No users are disqualified from the current round in ${channel}.`,
							fields: [getDisqualifiedPlayersEmbedField(game)],
						}],
						ephemeral: true,
					});
					return;
				}

				// Remove all players from the list
				game.state.disqualifiedFromRound.clear();

				// Respond to user
				await interaction.reply({
					embeds: [{
						title: "Current round player exclusion list updated",
						description: `All players removed from the list of players disqualified from the current round in ${channel}.`,
						fields: [getDisqualifiedPlayersEmbedField(game)],
					}],
					ephemeral: true,
				});

				return;
		}
	},
};

export default commandSpec;
