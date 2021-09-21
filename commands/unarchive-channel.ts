import { SlashCommandBuilder } from '@discordjs/builders';

import { updateGameState, getStatusEmbedField } from '../lib/game-state';
import { recount } from '../lib/scoring';

const commandSpec: SlashCommandSpec = {
	permissions: 'judge',
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-unarchive-channel')
		.setDescription("Mark a tag game as still running (this also recalculates its scores).")
		.addChannelOption((option) =>
			option.setName('game-channel')
			.setDescription("Channel in which the tag game has been marked as archived (this channel if not set).")
			.setRequired(false)
		),


	handler: async (interaction, channel, game) => {
		// Handle case where the game was not archived
		if (game.state.status !== 'archived') {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `The tag game in ${channel} is not archived.`,
					fields: [
						getStatusEmbedField(game),
					],
				}],
				ephemeral: true,
			});
			return;
		}

		// Inform the user this may take time
		const deferralPromise = interaction.deferReply({ ephemeral: true });

		// Recount to figure out the current state of the game
		const newState = await recount(game);

		// Update game state
		await updateGameState(game, newState);

		// Respond to the user
		await deferralPromise;
		await interaction.editReply({
			embeds: [{
				title: "Tag game unarchived",
				description: `Tag game in ${channel} has been unarchived and scores recalculated.`,
				fields: [
					getStatusEmbedField(game),
				],
			}],
		});
	},
};

export default commandSpec;
