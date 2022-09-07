import * as m from './message';
import { SnowflakeUtil, Message } from 'discord.js';
import type { APIAttachment } from 'discord-api-types/v10';
import { getClient, getGuild, getTextChannel, getUser, getMessage } from '../test/fixtures';

import { mocked } from 'jest-mock';

jest.mock('./state');
import appState from './state';
const mockAddDeletedMessageId = mocked(appState.deletedMessageIds.add);

const guild = getGuild();
const channel = getTextChannel(guild);
const user1 = getUser('user-1');
const user2 = getUser('user-2');
const user3 = getUser('user-3');

describe("messageHasImage", () => {
	function messageWithAttachments(attachments: APIAttachment[]): Message {
		// @ts-expect-error -- private constructor
		return new Message(getClient(), {
			id: SnowflakeUtil.generate({ timestamp: new Date('2020Z')}),
			channel_id: channel.id,
			guild_id: channel.guildId,
			author: {
				id: user1.id,
				username: user1.username,
				avatar: user1.avatar,
				discriminator: user1.discriminator,
			},
			content: "test message",
			timestamp: null,
			edited_timestamp: null,
			tts: false,
			mention_everyone: false,
			mentions: [],
			mention_roles: [],
			mention_channels: [],
			attachments,
			embeds: [],
			pinned: false,
			type: 0,
		});
	}

	it("returns false for a message with no attachment", () => {
		expect(m.messageHasImage(messageWithAttachments([]))).toBe(false);
	});

	it("returns false for a message with an attachment which has no content type", () => {
		expect(m.messageHasImage(messageWithAttachments([
			{
				id: SnowflakeUtil.generate().toString(),
				filename: 'foo.dng',
				content_type: undefined,
				size: 3333,
				url: 'http://example.com/foo.dng',
				proxy_url: 'http://example.com/foo.dng',
			},
		]))).toBe(false);
	});

	it("returns false for a message with an attachment which is not an image or video", () => {
		expect(m.messageHasImage(messageWithAttachments([
			{
				id: SnowflakeUtil.generate().toString(),
				filename: 'foo.txt',
				content_type: 'text/plain',
				size: 3333,
				url: 'http://example.com/foo.txt',
				proxy_url: 'http://example.com/foo.txt',
			},
		]))).toBe(false);
	});

	it("returns true for a message with a jpeg attachment", () => {
		expect(m.messageHasImage(messageWithAttachments([
			{
				id: SnowflakeUtil.generate().toString(),
				filename: 'foo.jpg',
				content_type: 'image/jpeg',
				size: 3333,
				url: 'http://example.com/foo.jpg',
				proxy_url: 'http://example.com/foo.jpg',
				width: 2000,
				height: 1000,
			},
		]))).toBe(true);
	});

	it("returns true for a message with a PNG attachment", () => {
		expect(m.messageHasImage(messageWithAttachments([
			{
				id: SnowflakeUtil.generate().toString(),
				filename: 'foo.png',
				content_type: 'image/png',
				size: 3333,
				url: 'http://example.com/foo.png',
				proxy_url: 'http://example.com/foo.png',
				width: 2000,
				height: 1000,
			},
		]))).toBe(true);
	});

	it("returns true for a message with a WebP attachment", () => {
		expect(m.messageHasImage(messageWithAttachments([
			{
				id: SnowflakeUtil.generate().toString(),
				filename: 'foo.webp',
				content_type: 'image/webp',
				size: 3333,
				url: 'http://example.com/foo.webp',
				proxy_url: 'http://example.com/foo.webp',
				width: 2000,
				height: 1000,
			},
		]))).toBe(true);
	});

	it("returns true for a message with a video attachment", () => {
		expect(m.messageHasImage(messageWithAttachments([
			{
				id: SnowflakeUtil.generate().toString(),
				filename: 'foo.mp4',
				content_type: 'video/mp4',
				size: 3333,
				url: 'http://example.com/foo.mp4',
				proxy_url: 'http://example.com/foo.mp4',
				width: 2000,
				height: 1000,
			},
		]))).toBe(true);
	});

	it("returns true for a message whose image/video attachment is not first or last", () => {
		expect(m.messageHasImage(messageWithAttachments([
			{
				id: SnowflakeUtil.generate().toString(),
				filename: 'foo.txt',
				content_type: 'text/plain',
				size: 3333,
				url: 'http://example.com/foo.txt',
				proxy_url: 'http://example.com/foo.txt',
			},
			{
				id: SnowflakeUtil.generate().toString(),
				filename: 'foo.png',
				content_type: 'image/png',
				size: 3333,
				url: 'http://example.com/foo.png',
				proxy_url: 'http://example.com/foo.png',
				width: 2000,
				height: 1000,
			},
			{
				id: SnowflakeUtil.generate().toString(),
				filename: 'foo.htm',
				content_type: 'text/html',
				size: 3333,
				url: 'http://example.com/foo.htm',
				proxy_url: 'http://example.com/foo.htm',
			},
		]))).toBe(true);
	});
});

describe("getMessageUsers", () => {
	it("includes the message author", () => {
		const message = getMessage(channel, user1, [], false, false, new Date('2020Z'), "test message");
		const author = message.author;
		const result = m.getMessageUsers(message);
		expect(result.has(author)).toBe(true);
	});

	it("includes mentioned users", () => {
		expect.assertions(2);
		const message = getMessage(channel, user1, [user2, user3], false, false, new Date('2020Z'), "test message");
		const result = m.getMessageUsers(message);
		for (const mention of message.mentions.users.values()) {
			expect(result.has(mention)).toBe(true);
		}
	});
});

describe("deleteMessage", () => {
	beforeEach(() => {
		appState.deletedMessageIds.clear();
	});

	it("calls the message's delete method", async () => {
		const message = getMessage(channel, user1, [], false, false, new Date('2020Z'), "test message");
		const spiedDelete = jest.spyOn(message, 'delete').mockResolvedValue(message);
		await m.deleteMessage(message);
		expect(spiedDelete).toHaveBeenCalledTimes(1);
	});

	it("adds the message's ID to the list of deleted messages", async () => {
		const message = getMessage(channel, user1, [], false, false, new Date('2020Z'), "test message");
		const spiedDelete = jest.spyOn(message, 'delete').mockResolvedValue(message);
		expect(appState.deletedMessageIds.has(message.id)).toBe(false);
		await m.deleteMessage(message);
		expect(appState.deletedMessageIds.has(message.id)).toBe(true);
	});
});
