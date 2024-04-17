Discord Tag Bot
===============

This bot facilitates image tag games on Discord servers.

It was originally written for [Raincity Bike Crew](https://www.raincitybikecrew.com/).

About the game
--------------

The idea of the game is that one person (or group of people) posts a photo of a particular location
(the "tag")
and then somebody else (or another group) is to post an associated image,
possibly of the same location (the "match").
Doing this gives them a score, and it is then their turn to post the next tag.

About the bot
-------------

The bot facilitates the game by keeping track of game status
(if the game is open,
or we're awaiting a match,
or we're awaiting a new tag,
or it's inactive)
and score.

It also polices who can post images in the game channel:

- If awaiting a match,
  those who posted or were mentioned in the tag
  are not allowed to post the next image or be mentioned in it.
- If awaiting a new tag after a match,
  only those who posted or were mentioned in the match
  are allowed to post the next tag.

The bot can track multiple tag games at once,
each with different configurations.

Each concurrent tag game must be in its own Discord channel,
and it must be a text-based channel.

There can optionally be a chat channel associated with each game channel,
in which messages will be posted when game events happen.
This can be the same chat channel for multiple game channels,
or there can be a separate chat channel for each.

The bot is sophisticated enough to notice edits, deletions, and bulk-deletions in game channels.
In each case, a recount is triggered
if the edited or deleted message is within the timeframe of the current game.
If any scores change, it is announced in the chat channel, if one is set.

The bot is set up and controlled via slash-commands.
The commands must be run in the channel the game is to take place in.

### Adding the bot to your server

You can [use my instance of the bot on your server](https://discord.com/api/oauth2/authorize?client_id=887427806395498588&permissions=75776&scope=applications.commands%20bot).
I make no guarantees about its uptime or stability.
If you care about that, [build and launch your own instance of the bot](#technical-stuff).

### Registering a game

To register a game, use the `/tag-init` command
in the channel which will host the game.
This will register the channel as one hosting a game,
set the game's status to "inactive",
and start watching incoming messages.

You can undo this, and unregister the channel by using `/tag-forget`.
This will stop tracking the game.
It won't do anything else -- for example, any messages posted by the bot are not removed;
this can be done manually.

These commands can only be performed by server admins.

### Configuring the game

These commands can only be performed by server admins
and by tag judges for the game in question.

- **`/tag-judge-role add`:** associate a particular role
  with the tag game in this channel.
  After doing this, members of this role are considered to be judges of that game.
  These members can then perform most configuration and admin commands.
  Multiple roles can be added,
  and the same roles can be used as judges in multiple games.

- **`/tag-judge-role remove`:** disassociate a particular role
  with the tag game in this channel.

- **`/tag-time-limit set`:** set or change the time limit for a player who posted a match to post a new tag,
  for the tag game in this channel.
  No scores are recalculated; this only affects new tags.
  This defaults to 60 minutes, and can be set to any number of minutes.

  If there is a time limit,
  the users who posted a match are reminded when about 10% of the time
  (rounded up to the next 5 minute increment) remains,
  as long as that's at least 10 minutes.

  If no new tag is posted when the time runs out,
  an announcement is made,
  and the current match is deleted, meaning those users lose their score.
  Those users are then disqualified from the current round,
  and we await a new match from somebody else.

- **`/tag-time-limit clear`:** remove the time limit for a player who posted a match to post a new tag
- for the tag game in this channel.
  No scores are recalculated; this only affects new tags.

- **`/tag-chat-channel set`:** associate another channel as the chat channel
  for the tag game in this channel.
  The same channel can be used as the chat channel for multiple games.
  Once a chat channel is associated, messages will be posted there when game events occur.

- **`/tag-chat-channel unset`:** disassociate a chat channel from this tag game.

- **`/tag-lifespan period`:** set the period on which games run.
  If set to `manual`, the game will not be on a timer, and must be manually
  started and stopped.
  If set to a measure of time,
  it will be interpreted according to the configured locale,
  and the game will automatically stop at the end of the period.
  **This is not yet working;
  at the the time of writing the bot always acts as if in manual mode.**

- **`/tag-lifespan auto-restart`:** set whether a game configured to run on a period
  will automatically restart immediately after completing.

- **`/tag-lifespan locale`:** configure the locale
  under which the game's period will be interpreted.
  Examples: `America/Vancouver`, `Europe/London`, `UTC`.
  [See the list of locales](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

- **`/tag-ranking-strategy set`:** configure the [ranking strategy](https://en.wikipedia.org/wiki/Ranking#Strategies_for_assigning_rankings)
  used when formatting scoreboards.
  The default is standard competition ranking.

### Inactive games

When a channel is first registered via the `/tag-init` command,
and if a game is finished without restarting,
it is in the "inactive" state.

This means any new messages with images coming in will be deleted immediately,
with a message reminding the author that the game is inactive.

### Starting and stopping the game

The game can be started and stopped with the `/tag-game-control` commands.

- **`/tag-game-control start`:** starts the game.
  A message marking the start of the game
  and which will be kept up to date with scores and status
  is posted in the game channel, and pinned.
  If a chat channel in configured, an announcement is made here too.

- **`/tag-game-control finish`:** finishes the game.
  The start/status message posted when the game started is
  edited to link to the end,
  unpinned,
  and no longer shows the scores.
  A new message is posted in the game channel showing the final scores.
  If a chat channel is configured, an announcement is made here too.

  Games stopped in this way will not automatically restart right away.
  If configured to be periodic and to automatically restart,
  a game stopped in this way will restart automatically
  when the period rolls around.

### Managing disqualified players

If players miss a time limit they are disqualified from the current round.
The list of disqualified players can expand
if other players then post a match and fail to meet *their* time limit.

In normal situations this list of disqualified players is managed automatically:
players associated with a match are added to the list if they then miss the time limit to post the next tag,
and the list is cleared once a new tag is posted.

However, in certain situations where a recount was required,
such as due to a bulk message deletion,
it's possible for the list to get out of sync.

It may also be desirable to manually manage the list of disqualifications for arbitrary reasons.

For those reasons some disqualification list management commands are available:

- **`/tag-disqualified add`:** add a user to the list of disqualified players for the current round.

- **`/tag-disqualified remove`:** remove a user from the list of disqualified players for the current round.

- **`/tag-disqualified clear`:**: clear the list of disqualified players for the current round.

### Miscellaneous commands

- **`/tag-recount`:** force a recount of the current game.
  Only server admins and tag judges can do this.

  The pinned message is updated with the recalculated scores and state.
  If any scores changed, it is announced in the chat channel, assuming one is set.

  This does nothing on inactive games.

- **`/tag-show-status`:** show (just to you) the current game status.

- **`/tag-show-config`:** show (just to you) the current game configuration.

- **`/tag-about`:** show (just to you) some info about the bot.

Technical stuff
---------------

You can build and run the bot yourself.

### Setting up a Discord application

First you'll need to set up your own Discord app;
see [the Discord developer portal](https://discord.com/developers)
and set up a new application.

You'll need to enable the "message content" intent on the "bot" page.

### Install dependencies

`npm ci`

### Run tests

`npm test` or `npm test -- --watch`

### Configure the bot

Copy the file `.env.example` to `.env`
and edit it to set your bot's login token.

Alternatively, set the bot's login token as `DISCORD_TOKEN` in your environment.

### Add the bot to a server

`https://discord.com/api/oauth2/authorize?client_id=<APPLICATION_ID>&permissions=75776&scope=applications.commands%20bot`

Those permissions are:

- Send messages
- Manage messages
- Read message history

### Build the application

`npm run build` or `npm run build -- --watch`

### Run the bot

`npm start`

Future
------

- Harden
- Finish tests
- Extract clues (spoiler tags) and print in "new tag" and "tag matched" messages?
- Awards at game end time (most-reacted, ???)
- Default locale to system locale, or environment variable
- Only allow specific players to post first tag at the start of the next game
- Allow docking arbitrary points without actually deleting pics etc
- Notifications when people take the lead, change positions etc
- Allow webhook subscriptions so people can get SMSes via "if this then that" or whatever they want
- Allow a message on tag matches to be enforced (eg location), probably just with a warning in the chat channel

Near future:
- abstract timers with a setInterval running once an hour or whatever to keep them on track
- add game scheduling
