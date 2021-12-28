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
or it's archived)
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

To register a game, use the `/tag-add-channel` command
in the channel which will host the game.
This will do a few things:

- Register that channel as one hosting a game
- Look through all messages so far posted,
  and determine the game state and current scores
- Post and pin a status message to the game channel,
  which will remain updated

From now on, messages being sent to this channel will be watched.

You can undo this, and unregister a game by using `/tag-remove-channel`.
This will stop tracking the game.
It won't do anything else -- for example, the tagged status message is not removed;
this can be done manually.
Note that this is different from archiving the game.

These commands can only be performed by server admins.

### Configuring the game

These commands can only be performed by server admins
and by tag judges for the game in question.

- **`/tag-add-judge-role`:** associate a particular role
  with the tag game in this channel.
  After doing this, members of this role are considered to be judges of that game.
  These members can then perform most configuration and admin commands.
  Multiple roles can be added,
  and the same roles can be used as judges in multiple games.

- **`/tag-remove-judge-role`:** disassociate a particular role
  with the tag game in this channel.

- **`/tag-set-next-tag-time-limit`:** change the time limit for a player who posted a match to post a new tag,
  for the tag game in this channel.
  This defaults to 60 minutes, and can be set to a number of minutes
  or to `0` for no time limit.

  If there is a time limit,
  the users who posted a match are reminded when about 10% of the time
  (rounded up to the next 5 minute increment) remains,
  as long as that's at least 10 minutes.

  If no new tag is posted when the time runs out,
  an announcement is made,
  and the current match is deleted, meaning those users lose their score.
  Those users are then disqualified from the current round,
  and we await a new match from somebody else.

- **`/tag-set-chat-channel`:** associate another channel as the chat channel
  for the tag game in this channel.
  The same channel can be used as the chat channel for multiple games.
  Once a chat channel is associated, messages will be posted there when game events occur.

- **`/tag-clear-chat-channel`:** disassociate a chat channel from this tag game.

### Archiving a game

Once a game is finished
(maybe it's the end of the month and the winner has been awarded with a nice prize)
you can archive it by running the `/tag-archive-channel` command.

This means any new messages with images coming in will be deleted immediately,
with a message reminding the author that the game is finished.

The status message in the game channel with the scoreboard will remain pinned.

If a chat channel was associated with the game,
a message announcing that the game is over will be posted there,
with the top 3 scores shown,
along with a link to the pinned post in the game channel
which has with the full scoreboard.

Archiving a channel can be undone with the `/tag-unarchive-channel` command,
which also forces a recount
(to figure out what the game status was).
This does not delete any end-of-game announcement which might have been posted.

These archiving commands can only be performed by admins,
and by tag judges associated with that game.

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

- **`/tag-disqualified-add`:** add a user to the list of disqualified players for the current round.

- **`/tag-disqualified-remove`:** remove a user from the list of disqualified players for the current round.

- **`/tag-disqualified-clear`:**: clear the list of disqualified players for the current round.

### Miscellaneous commands

- **`/tag-recount-channel`:** force a recount of the current game.
  Only server admins and tag judges can do this.

  If a recount is asked for on an archived game, the result is not stored,
  and the pinned status message is not edited;
  the results are only shown to the user then discarded.

  In other cases, the pinned message is updated with the recalculated scores and state.
  If any scores changed, it is announced in the chat channel, assuming one is set.

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
