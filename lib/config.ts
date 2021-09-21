import type { Message, EmbedFieldData } from 'discord.js';

import { pluralize, toList } from './string';

/**
 * Get the default configuration, applied to new games.
 */
export function getDefaultConfig(): Config {
	return {
		nextTagTimeLimit: 1e3 * 60 * 60,
		tagJudgeRoles: new Set(),
		chatChannel: null,
	};
}

/**
 * Serialize config to something which can be persisted.
 */
export function serializeConfig(config: Config): SerializedConfig {
	return {
		nextTagTimeLimit: config.nextTagTimeLimit,
		tagJudgeRoleIds: [...config.tagJudgeRoles].map((role) => role.id),
		chatChannelId: config.chatChannel?.id,
	};
}

/**
 * Get the configuration embed field.
 */
export function getConfigEmbedFields(config: Config): EmbedFieldData[] {
	const minutes = config.nextTagTimeLimit == null ? null : config.nextTagTimeLimit / 1e3 / 60;
	return [
		{
			name: "Time limit to post new tag",
			value: `${minutes == null ? "None" : `${minutes} ${pluralize("minute", minutes)}`}`,
			inline: true,
		},
		{
			name: "Judge roles",
			value: config.tagJudgeRoles.size ? toList(config.tagJudgeRoles) : "None",
			inline: true,
		},
		{
			name: "Chat channel",
			value: config.chatChannel?.toString() ?? "None",
			inline: true,
		},
	];
}
