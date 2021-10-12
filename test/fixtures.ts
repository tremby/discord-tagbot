/* istanbul ignore file */

import {
	ClientUser,
	Client,
	Guild,
	SnowflakeUtil,
	Role,
	TextChannel,
	Message,
	User,
	GuildMember,
	Constants,
	CommandInteraction,
} from 'discord.js';
import type { APIApplicationCommandInteractionDataOptionWithValues } from 'discord-api-types/v9';

const client = new Client({ intents: [] });
const botUser = getUser('bot-user');
// @ts-expect-error -- private constructor
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
	// @ts-expect-error -- private constructor
	return new Guild(getClient(), {
		id: id ?? SnowflakeUtil.generate(),
		unavailable: false,
	});
}

export function getRole(guild: Guild, passedId?: string): Role {
	const id = passedId ?? SnowflakeUtil.generate();
	// @ts-expect-error -- private constructor
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
	// @ts-expect-error -- private constructor
	return new TextChannel(guild, {
		id: id ?? SnowflakeUtil.generate(),
		type: Constants.ChannelTypes.GUILD_TEXT.valueOf(),
	}, getClient());
}

export function getUser(passedId?: string): User {
	const id = passedId ?? SnowflakeUtil.generate();
	// @ts-expect-error -- private constructor
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
	// @ts-expect-error -- private constructor
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
	// @ts-expect-error -- private constructor
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

export function getCommandInteraction(channel: TextChannel, author: User, name: string, options: APIApplicationCommandInteractionDataOptionWithValues[] = []): CommandInteraction {
	// @ts-expect-error -- private constructor
	const interaction = new CommandInteraction(getClient(), {
		id: SnowflakeUtil.generate(),
		application_id: '',
		type: 2,
		token: '',
		version: 1,
		channel_id: channel.id,
		member: {
			permissions: '',
			deaf: false,
			mute: false,
			joined_at: '0',
			roles: [],
			user: {
				id: author.id,
				discriminator: author.discriminator,
				username: author.username,
				avatar: author.avatar,
			}
		},
		data: {
			id: SnowflakeUtil.generate(),
			name,
			options: options as never, // FIXME: can't figure out this type
		},
	});

	interaction.reply = jest.fn();
	interaction.deferReply = jest.fn();
	interaction.editReply = jest.fn();

	return interaction;
}
