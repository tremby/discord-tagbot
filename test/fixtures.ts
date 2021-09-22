import { Client, Guild, SnowflakeUtil, Role, TextChannel, Constants } from 'discord.js';

const client = new Client({ intents: [] });

export function getClient(): Client {
	return client;
}

export function getGuild(id?: string): Guild {
	return new Guild(getClient(), {
		id: id ?? SnowflakeUtil.generate(),
		unavailable: false,
	});
}

export function getRole(guild: Guild, passedId?: string): Role {
	const id = passedId ?? SnowflakeUtil.generate();
	return new Role(client, {
		id,
		name: `role-${id}`,
		color: 0,
		hoist: false,
		position: 0,
		permissions: '0',
		managed: false,
		mentionable: true,
	}, guild);
}

export function getTextChannel(guild: Guild, id?: string): TextChannel {
	const channel = new TextChannel(guild, {
		id: id ?? SnowflakeUtil.generate(),
		type: Constants.ChannelTypes.GUILD_TEXT.valueOf(),
	}, getClient());
	return channel;
}
