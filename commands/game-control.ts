import { MessageFlags } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import {
	getStatusEmbedField,
	gameStateIsInactive,
	start,
	finish,
} from '../lib/game-state';
import { getConfigEmbedFields } from '../lib/config';

const commandDescription = new SlashCommandBuilder()
	.setName('tag-game-control')
	.setDescription("Manually control a tag game.");

commandDescription.addSubcommand((sc) => sc
	.setName('start')
	.setDescription("Begin the game.")
);

commandDescription.addSubcommand((sc) => sc
	.setName('finish')
	.setDescription("Finish the game.")
);

const commandSpec: SlashCommandSpec = {
	permissions: 'judge',
	requireGame: true,

	description: commandDescription,

	handler: async (interaction, channel, game) => {
		if (game == null) throw new Error("game-control commands should always have game set");

		switch (interaction.options.getSubcommand()) {
			case 'start': {
				// Handle case where the game is already running
				if (!gameStateIsInactive(game.state)) {
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: `The tag game in ${channel} is already running.`,
							fields: [
								getStatusEmbedField(game),
							],
						}],
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				// Log the interaction
				console.log(`Game-control start command run in channel ${channel} on server ${channel.guild.id} by user ${interaction.member?.user.id} (${interaction.member?.user.username})`);

				// Inform the user this may take time
				const deferralPromise = interaction.deferReply({ flags: MessageFlags.Ephemeral });

				// Start the game
				await start(game);

				// Respond to the user
				await deferralPromise;
				await interaction.editReply({
					embeds: [{
						title: "Tag game started",
						description: `Tag game in ${channel} has been started.`,
						fields: [
							getStatusEmbedField(game),
						],
					}],
				});

				return;
			}

			case 'finish': {
				// Handle channel which was already inactive
				if (gameStateIsInactive(game.state)) {
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: `The tag game in ${channel} is not currently running.`,
							fields: [
								getStatusEmbedField(game),
							],
						}],
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				// Log the interaction
				console.log(`Game-control finish command run in channel ${channel} on server ${channel.guild.id} by user ${interaction.member?.user.id} (${interaction.member?.user.username})`);

				// Inform the user this may take time
				const deferralPromise = interaction.deferReply({ flags: MessageFlags.Ephemeral });

				// Finish the game, and possibly start the next one
				await finish(game, false);

				// Respond to user
				await deferralPromise;
				if (gameStateIsInactive(game.state)) {
					await interaction.editReply({
						embeds: [{
							title: "Tag game finished",
							description: `Tag game in ${channel} has been finished. The game is now in an inactive state.`,
							fields: [
								getStatusEmbedField(game),
							],
						}],
					});
				} else {
					await interaction.editReply({
						embeds: [{
							title: "Tag game restarted",
							description: `Tag game in ${channel} has been finished and restarted.`,
							fields: [
								getStatusEmbedField(game),
							],
						}],
					});
				}

				return;
			}
		}
	},
};

export default commandSpec;
