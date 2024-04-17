import * as thisModule from './permissions';

import { PermissionFlagsBits, Guild } from 'discord.js';
import type { TextChannel, EmbedField } from 'discord.js';

import appState from './state';

export type PermissionStatus = {
	name: string;
	channel: TextChannel;
	reason: string;
	ok: boolean;
};

// Check if the bot has the necessary permissions in a particular game or guild
export async function checkPermissions(subject: Game | Guild): Promise<PermissionStatus[]> {
	const guild = subject instanceof Guild ? subject : subject.channel.guild;

	// Get bot
	const me = guild.members.me;

	if (!me) {
		console.error(`Couldn't get bot user when trying to check permissions in ${guild}`);
		return [];
	}

	// Collect relevant channels
	const gameChannels = new Set<TextChannel>();
	const chatChannels = new Set<TextChannel>();
	if (subject instanceof Guild) {
		for (const game of appState.games.values()) {
			if (game.channel.guild === guild) gameChannels.add(game.channel);
			if (game.config.chatChannel?.guild === guild) chatChannels.add(game.config.chatChannel);
		}
	} else {
		gameChannels.add(subject.channel);
		if (subject.config.chatChannel) chatChannels.add(subject.config.chatChannel);
	}

	// Check if we have the permissions we need
	const results: PermissionStatus[] = [];
	for (const channel of gameChannels.values()) {
		results.push({
			name: "Read message history",
			channel,
			reason: "I need this so I can count and recount scores.",
			ok: me.permissionsIn(channel).has(PermissionFlagsBits.ReadMessageHistory),
		}, {
			name: "Send messages",
			channel,
			reason: "I need this so I can post game status messages and tell users what they've done wrong if I delete something.",
			ok: me.permissionsIn(channel).has(PermissionFlagsBits.SendMessages),
		}, {
			name: "Manage messages",
			channel,
			reason: "I need this so I can pin game status messages and so I can delete illegal messages.",
			ok: me.permissionsIn(channel).has(PermissionFlagsBits.ManageMessages),
		});
	}
	for (const channel of chatChannels.values()) {
		results.push({
			name: "Send messages",
			channel,
			reason: "I need this so I can post game update messages, time limit reminders, and so I can tell users what they've done wrong if I delete something.",
			ok: me.permissionsIn(channel).has(PermissionFlagsBits.SendMessages),
		});
	}

	if (!thisModule.haveAllPermissions(results)) {
		console.warn(`Missing some permissions: ${results.filter(( { ok }) => !ok).map(({ name, channel }) => `"${name}" in ${channel}`).join(", ")}`);
	}

	return results;
}

export function haveAllPermissions(perms: PermissionStatus[]): boolean {
	return perms.every(({ ok }) => ok);
}

export function getPermissionsMessage(perms: PermissionStatus[], length: 'brief' | 'full'): string {
	if (length === 'brief') {
		if (thisModule.haveAllPermissions(perms)) {
			return "✅ I have all the permissions I need.";
		}
		return perms.map(({ name, channel, ok }) =>
			`- ${ok ? "✅" : "❌"} "**${name}**" in ${channel}`).join("\n");
	}

	return [
		"I don't have all the permissions I need:",
		"",
		perms.map(({ name, channel, reason, ok }) =>
			`- ${ok ? "✅" : "❌"} "**${name}**" in ${channel}. ${reason}`).join("\n"),
		"",
		"I might not function properly until I have them all.",
		"",
		`I don't really mind whether you add them to everyone `
			+ `or to my special "integration-managed" role or to another role I'm part of, `
			+ `but it's best to grant them to my special role.`,
		"",
		"You can check if the issue is resolved by running `/tag-show-permissions` "
			+ "in any channel of your server that I can see.",
	].join("\n");
}

export async function getPermissionsEmbedField(subject: Game | Guild): Promise<EmbedField> {
	const perms = await thisModule.checkPermissions(subject);
	return {
		inline: false,
		name: "Permissions",
		value: getPermissionsMessage(perms, 'brief'),
	};
}

export async function checkPermissionsAndWarn(guild: Guild, length: 'brief' | 'full'): Promise<void> {
	const perms = await thisModule.checkPermissions(guild);
	if (thisModule.haveAllPermissions(perms)) return;
	const owner = await guild.fetchOwner();
	await owner.send(getPermissionsMessage(perms, length));
}

// Check if the bot has the necessary permissions in all guilds;
// inform the owners if not.
export async function checkAllPermissionsAndWarn(): Promise<void> {
	const guilds = new Set<Guild>([...appState.games.values()].map((game) => game.channel.guild));
	await Promise.all([...guilds.values()].map(async (guild) => {
		const perms = await thisModule.checkPermissions(guild);
		if (!thisModule.haveAllPermissions(perms)) {
			const owner = await guild.fetchOwner();
			await owner.send(getPermissionsMessage(perms, "full"));
		}
	}));
}
