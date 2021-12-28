import { SlashCommandBuilder } from '@discordjs/builders';

import { isRole } from '../lib/role';
import { getConfigEmbedFields } from '../lib/config';

const commandSpec: SlashCommandSpec = {
	permissions: 'admin',
	requireGame: true,

	description: new SlashCommandBuilder()
		.setName('tag-remove-judge-role')
		.setDescription("Remove a role from the list of judges for a tag game.")
		.addRoleOption((option) =>
			option.setName('role')
			.setDescription("Role to remove.")
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

		// Handle the case where the role wasn't registered
		if (!game.config.tagJudgeRoles.has(role)) {
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: `The role ${role} was not on the judge list for the tag game in ${channel}.`,
					fields: getConfigEmbedFields(game.config),
				}],
				ephemeral: true,
			});
			return;
		}

		// Unregister the role
		game.config.tagJudgeRoles.delete(role);

		// Respond to user
		await interaction.reply({
			embeds: [{
				title: "Configuration updated",
				description: `Role ${role} removed from judge list for the tag game in ${channel}.`,
				fields: getConfigEmbedFields(game.config),
			}],
			ephemeral: true,
		});
	},
};

export default commandSpec;
