import type { Message, EmbedField } from 'discord.js';

import { pluralize, toList } from './string';

/**
 * Get the default configuration, applied to new games.
 */
export function getDefaultConfig(): Config {
	return {
		nextTagTimeLimit: 1e3 * 60 * 60,
		tagJudgeRoles: new Set(),
		chatChannel: null,
		autoRestart: false,
		period: null,
		locale: 'UTC',
	};
}

/**
 * Serialize config to something which can be persisted.
 */
export function serializeConfig(config: Config): SerializedConfig {
	return {
		nextTagTimeLimit: config.nextTagTimeLimit,
		tagJudgeRoleIds: [...config.tagJudgeRoles].map((role) => role.id),
		chatChannelId: config.chatChannel?.id ?? null,
		autoRestart: config.autoRestart,
		period: config.period,
		locale: config.locale,
	};
}

/**
 * Get the configuration embed field.
 */
export function getConfigEmbedFields(config: Config): EmbedField[] {
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
		{
			name: "Game lifespan",
			value: getLifespanString(config),
			inline: true,
		},
		config.period == null ? [] : {
			name: "Timekeeping locale",
			value: config.locale,
			inline: true,
		},
	].flat();
}

/**
 * Get a plain English description of the period and autoRestart config options.
 */
export function getLifespanString(config: Config): string {
	if (config.period == null) return "Manual control";

	if (config.period === 'month') {
		if (config.autoRestart) return "Restarts at the end of the month";
		return "Stops at the end of the month";
	}

	if (config.autoRestart) return "Restarts at the end of the hour";
	return "Stops at the end of the hour";
}
