import { MessageFlags } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import { getPermissionsEmbedField } from '../lib/permissions';

const commandSpec: SlashCommandSpec = {
	permissions: null,
	requireGame: false,

	description: new SlashCommandBuilder()
		.setName('tag-show-permissions')
		.setDescription("Show the status of the permissions the bot needs."),

	handler: async (interaction, channel) => {
		// Reply to user with status
		await interaction.reply({
			embeds: [{
				title: "Permissions status",
				fields: [
					await getPermissionsEmbedField(channel.guild),
				],
			}],
			flags: MessageFlags.Ephemeral,
		});
	},
};

export default commandSpec;
