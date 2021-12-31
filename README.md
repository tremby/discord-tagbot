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

Each tag game must be in its own Discord channel,
and it must be a text-based channel.

There can optionally be a chat channel associated with each game channel,
in which messages will be posted when game events happen.
This can be the same chat channel for multiple game channels,
or there can be a separate chat channel for each.

The bot is sophisticated enough to notice edits, deletions, and bulk-deletions in game channels.
In each case, a recount is triggered.
If any scores change, it is announced in the chat channel, if one is set.

The bot is set up and controlled via slash-commands.
The commands can be run from any channel.
If you want the command to affect a game running in a different channel,
you need to specify the game channel as an option to the command.
You can leave this out if you intend the command to take action on the current channel
(where you type your slash command).

### Registering a game

A tag game can be registered when already in motion
(as long as the players stuck to the conventions the bot expects)
or in an empty channel.

To register a game, use the `/tag-init` command
in the channel which will host the game.
This will do a few things:

- Register that channel as one hosting a game
- Look through all messages so far posted,
  and determine the game state and current scores
- Post and pin a status message to the game channel,
  which will remain updated

From now on, messages being sent to this channel will be watched.

You can undo this, and unregister a game by using `/tag-forget`.
This will stop tracking the game.
It won't do anything else -- for example, the tagged status message is not removed;
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

- **`/tag-lifespan auto-restart`:** set whether a game configured to run on a period
  will automatiaclly restart immediately after completing.

- **`/tag-lifespan locale`:** configure the locale
  under which the game's period will be interpreted.
  Examples: `America/Vancouver`, `Europe/London`, `UTC`.
  [See the list of locales](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

### Inactive games

If a game is finished without restarting,
it goes into the "inactive" state.

This means any new messages with images coming in will be deleted immediately,
with a message reminding the author that the game is finished.

The status message in the game channel with the latest scoreboard will remain pinned.

### Starting and stopping the game

The game can be started and stopped with the `/tag-game-control` commands.

- **`/tag-game-control start`:** starts the game.
  A message which will be kept up to date with scores and status
  is posted in the game channel, and pinned.
  If a chat channel in configured, an announcement is made here too.

- **`/tag-game-control finish`:** finishes the game.
  The start/status message posted when the game started is edited
  to mark the start of the game and link to the end, and is unpinned;
  it no longer shows the scores.
  A new message is posted in the game channel showing the final scores.
  If a chat channel is configured, an announcement is made here too.

  A periodic game stopped in this way will not automatically restart
  until the period rolls around.

  On the other hand, a non-periodic (manual) game
  *will* automatically restart.

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

Technical stuff
---------------

### Install dependencies

`npm ci`

### Run tests

`npm test` or `npm test -- --watch`

### Configure the bot

Copy the file `.env.example` to `.env`
and edit it to set your bot's login token.

Alternatively, set the bot's login token as `DISCORD_TOKEN` in your environment.

### Add the bot to a server

`https://discord.com/api/oauth2/authorize?client_id=<APPLICATION_ID>&permissions=75776&scope=bot`

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

Near future:
- abstract timers with a setInterval running once an hour or whatever to keep them on track
- add game scheduling
