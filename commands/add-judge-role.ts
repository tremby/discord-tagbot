import type { CommandInteraction, Role, TextChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import { persistToDisk } from '../lib/state';
import { isRole } from '../lib/role';
import { getConfigEmbedFields } from '../lib/config';

const commandSpec: SlashCommandSpec = {
	permissions: 'admin',
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-add-judge-role')
		.setDescription("Add a role to the list of judges for a tag game.")
		.addRoleOption((option) =>
			option.setName('role')
			.setDescription("Role to treat as judge.")
			.setRequired(true)
		),

	handler: async (interaction, channel, game) => {
		// Get the specified role
		const role = interaction.options.getRole('role');
		if (!isRole(role)) {
			console.error(`Got something which might be an APIRole rather than Role: ${role}`);
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: "Something went wrong when resolving the specified role.",
				}],
				ephemeral: true,
			});
			return;
		}

		// Handle the case where the role is already registered
		if (game.config.tagJudgeRoles.has(role)) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `The role ${role} is already on the judge list for the tag game in ${channel}.`,
					fields: getConfigEmbedFields(game.config),
				}],
				ephemeral: true,
			});
			return;
		}

		// Register the role
		game.config.tagJudgeRoles.add(role);
		persistToDisk();

		// Respond to user
		await interaction.reply({
			embeds: [{
				title: "Configuration updated",
				description: `Role ${role} added to judge list for the tag game in ${channel}.`,
				fields: getConfigEmbedFields(game.config),
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
