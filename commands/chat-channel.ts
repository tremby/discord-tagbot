import { InteractionType, MessageFlags } from 'discord.js';
import type { TextChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import { getValidChannel, NoTextChannelError } from './lib/helpers';
import { getConfigEmbedFields } from '../lib/config';
import { getPermissionsEmbedField } from '../lib/permissions';

const commandDescription = new SlashCommandBuilder()
	.setName('tag-chat-channel')
	.setDescription("Manage the game's associated chat channel");

commandDescription.addSubcommand((sc) => sc
	.setName('set')
	.setDescription("Set a chat channel associated with the tag game in this channel.")
	.addChannelOption((option) =>
		option.setName('channel')
		.setDescription("Channel used for chat about this tag game.")
		.setRequired(true)
	)
);

commandDescription.addSubcommand((sc) => sc
	.setName('unset')
	.setDescription("Unassociate the chat channel from the tag game.")
);

const commandSpec: SlashCommandSpec = {
	permissions: 'judge',
	requireGame: true,

	description: commandDescription,

	handler: async (interaction, channel, game) => {
		if (game == null) throw new Error("chat-channel commands should always have game set");

		switch (interaction.options.getSubcommand()) {
			case 'set': {
				// Check input
				let chatChannel: TextChannel;
				try {
					chatChannel = getValidChannel(interaction, 'channel');
				} catch (error) {
					if (!(error instanceof NoTextChannelError)) throw error;
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: error.message,
							fields: getConfigEmbedFields(game.config),
						}],
						flags: MessageFlags.Ephemeral,
					});
					return;
				}
				if (chatChannel === channel) {
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: `The chat channel cannot be set to the same channel as the game channel.`,
							fields: getConfigEmbedFields(game.config),
						}],
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				// Register the chat channel
				game.config = {
					...game.config,
					chatChannel,
				};

				// Respond to the user
				await interaction.reply({
					embeds: [{
						title: "Configuration updated",
						description: `Chat channel for the tag game in ${channel} is updated to ${chatChannel}.`,
						fields: [
							...getConfigEmbedFields(game.config),
							await getPermissionsEmbedField(game),
						],
					}],
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			case 'unset':
				// Handle the case where there wasn't a chat channel
				if (game.config.chatChannel == null) {
					await interaction.reply({
						embeds: [{
							title: "Error",
							description: `There was no chat channel associated with the tag game in ${channel}.`,
							fields: getConfigEmbedFields(game.config),
						}],
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				// Unregister the chat channel
				game.config = {
					...game.config,
					chatChannel: null,
				};

				// Respond to the user
				await interaction.reply({
					embeds: [{
						title: "Configuration updated",
						description: `Chat channel for the tag game in ${channel} has been disassociated.`,
						fields: getConfigEmbedFields(game.config),
					}],
					flags: MessageFlags.Ephemeral,
				});

				return;
		}
	},
};

export default commandSpec;
