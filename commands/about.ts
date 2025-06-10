import { MessageFlags } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { resolve } from 'path';
import { readFile } from 'fs/promises';

import version from '../lib/version';

const commandSpec: SlashCommandSpec = {
	permissions: null,
	requireGame: false,

	description: new SlashCommandBuilder()
		.setName('tag-about')
		.setDescription("Show information about the bot."),

	handler: async (interaction, channel) => {
		await interaction.reply({
			embeds: [{
				title: "About the bot",
				description: `This is Tagbot. It oversees tag games. If you like, you can use it on your server too.`,
				fields: [
					{
						inline: true,
						name: "Version",
						value: version,
					},
					{
						inline: true,
						name: "Author",
						value: "<@418938730284580876>",
					},
					{
						inline: true,
						name: "More info",
						value: "Documentation and source code are available [on Github](https://github.com/tremby/discord-tagbot).",
					},
				],
			}],
			flags: MessageFlags.Ephemeral,
		});
	},
};

export default commandSpec;
