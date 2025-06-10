import { MessageFlags } from 'discord.js';
import type { CommandInteraction, Role, TextChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import { persist } from '../lib/state';
import { isRole } from '../lib/role';
import { getConfigEmbedFields } from '../lib/config';

const commandDescription = new SlashCommandBuilder()
	.setName('tag-judge-role')
	.setDescription("Manage judge role configuration for this game.");

commandDescription.addSubcommand((sc) => sc
	.setName('add')
	.setDescription("Add a role to the list of judges for this tag game.")
	.addRoleOption((option) =>
		option.setName('role')
		.setDescription("Role to treat as judge.")
		.setRequired(true)
	),
);

commandDescription.addSubcommand((sc) => sc
	.setName('remove')
	.setDescription("Remove a role from the list of judges for this tag game.")
	.addRoleOption((option) =>
		option.setName('role')
		.setDescription("Role to remove.")
		.setRequired(true)
	),
);

const commandSpec: SlashCommandSpec = {
	permissions: 'admin',
	requireGame: true,

	description: commandDescription,

	handler: async (interaction, channel, game) => {
		if (game == null) throw new Error("judge-role commands should always have game set");

		// Get the specified role
		const role = interaction.options.getRole('role');

		if (role == null || !isRole(role)) {
			console.error(`Got null or something which might be an APIRole rather than Role: ${role}`);
			await interaction.reply({
				embeds: [{
					title: "Error",
					description: "Something went wrong when resolving the specified role.",
				}],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		switch (interaction.options.getSubcommand()) {
			case 'add':
				// Handle the case where the role is already registered
				if (game.config.tagJudgeRoles.has(role)) {
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: `The role ${role} is already on the judge list for the tag game in ${channel}.`,
							fields: getConfigEmbedFields(game.config),
						}],
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				// Register the role
				game.config.tagJudgeRoles.add(role);
				persist();

				// Respond to user
				await interaction.reply({
					embeds: [{
						title: "Configuration updated",
						description: `Role ${role} added to judge list for the tag game in ${channel}.`,
						fields: getConfigEmbedFields(game.config),
					}],
					flags: MessageFlags.Ephemeral,
				});

				return;

			case 'remove':
				// Handle the case where the role wasn't registered
				if (!game.config.tagJudgeRoles.has(role)) {
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: `The role ${role} was not on the judge list for the tag game in ${channel}.`,
							fields: getConfigEmbedFields(game.config),
						}],
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				// Unregister the role
				game.config.tagJudgeRoles.delete(role);
				persist();

				// Respond to user
				await interaction.reply({
					embeds: [{
						title: "Configuration updated",
						description: `Role ${role} removed from judge list for the tag game in ${channel}.`,
						fields: getConfigEmbedFields(game.config),
					}],
					flags: MessageFlags.Ephemeral,
				});

				return;
		}
	},
};

export default commandSpec;
