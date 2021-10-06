/* istanbul ignore file */

import { ClientUser, Client, Guild, SnowflakeUtil, Role, TextChannel, Message, User, GuildMember, Constants } from 'discord.js';

const client = new Client({ intents: [] });
const botUser = getUser('bot-user');
const clientUser = new ClientUser(getClient(), {
	id: botUser.id,
	username: botUser.username,
	discriminator: botUser.discriminator,
});
client.user = clientUser;

export function getClient(): Client {
	return client;
}

export function getBotUser(): User {
	return botUser;
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
	return new TextChannel(guild, {
		id: id ?? SnowflakeUtil.generate(),
		type: Constants.ChannelTypes.GUILD_TEXT.valueOf(),
	}, getClient());
}

export function getUser(passedId?: string): User {
	const id = passedId ?? SnowflakeUtil.generate();
	const user = new User(getClient(), {
		id,
		username: `username-${id}`,
		avatar: null,
		discriminator: '1234',
	});

	// Add this user to the cache, so it will be correctly looked up when making
	// messages etc, and so objects will be identical
	getClient().users.cache.set(user.id, user);

	return user;
}

export function getMember(guild: Guild, user: User, roles: Role[], passedId?: string): GuildMember {
	const id = passedId ?? SnowflakeUtil.generate();
	return new GuildMember(getClient(), {
		user: {
			id: user.id,
			username: user.username,
			discriminator: user.discriminator,
			avatar: user.avatar,
		},
		roles: roles.map((role) => role.id),
		joined_at: "2020Z",
		deaf: false,
		mute: false,
	}, guild);
}

export function getMessage(channel: TextChannel, author: User, mentions: User[], hasImage: boolean, pinned: boolean, timestamp: number | Date, content: string): Message {
	return new Message(getClient(), {
		id: SnowflakeUtil.generate(timestamp),
		channel_id: channel.id,
		guild_id: channel.guildId,
		author: {
			id: author.id,
			username: author.username,
			avatar: author.avatar,
			discriminator: author.discriminator,
		},
		content,
		timestamp: null,
		edited_timestamp: null,
		tts: false,
		mention_everyone: false,
		mentions: mentions.map((user) => ({
			id: user.id,
			username: user.username,
			avatar: user.avatar,
			discriminator: user.discriminator,
		})),
		mention_roles: [],
		mention_channels: [],
		attachments: hasImage ? [{
			id: SnowflakeUtil.generate(),
			filename: 'foo.jpg',
			content_type: 'image/jpeg',
			size: 3333,
			url: 'http://placekitten.com/408/287',
			proxy_url: 'http://placekitten.com/408/287',
			height: 287,
			width: 408,
		}] : [],
		embeds: [],
		pinned,
		type: 0,
	});
}
