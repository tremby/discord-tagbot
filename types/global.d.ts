import type { ChatInputCommandInteraction, TextChannel, Message, User, GuildMember, Role } from 'discord.js';
import type { SlashCommandBuilder } from '@discordjs/builders';

declare global {

	// FIXME: I don't like how specific this type is.
	// Is there a way to get this straight from the upstream types?
	type SlashCommandDescription = Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

	type SlashCommandHandler = (interaction: ChatInputCommandInteraction, channel: TextChannel, game: Game | null) => Promise<void>;

	type SlashCommandSpec = {
		description: SlashCommandDescription;
		handler: SlashCommandHandler;
		permissions: null | 'judge' | 'admin';
		requireGame: boolean;
	};

	type Game = {
		/**
		 * The channel hosting the game.
		 */
		channel: TextChannel;

		/**
		 * The configuration (rules) of the game.
		 */
		config: Config;

		/**
		 * The current state of the game.
		 */
		state: GameState;

		/**
		 * The message tracking the game status
		 * and indicating when the game began.
		 */
		statusMessage: Message | null;
	};

	/**
	 * A version of the Game representation suitable for persistence.
	 */
	type SerializedGame = {
		channelId: string;
		status: GameState['status'];
		config: SerializedConfig;
		disqualifiedFromRound?: string[];
		statusMessageId: string | null;
	}

	interface GameState {
		/**
		 * A string representing the current game state.
		 */
		status: 'inactive' | 'awaiting-match' | 'awaiting-next' | 'free';

		/**
		 * The current scores.
		 *
		 * Inactive games do not have scores.
		 */
		scores?: Scores;
	}

	/**
	 * The game state at the start of the game, before any tag has been posted.
	 * Any player can post the first tag.
	 */
	type GameStateFree = {
		status: 'free';
		scores: Scores;
	}

	/**
	 * The game state after a match has been posted,
	 * and we are awaiting any of the same players who posted the match
	 * to post the next tag.
	 */
	type GameStateAwaitingNext = {
		status: 'awaiting-next';
		scores: Scores;
		match: Message;
		reminderTimer: NodeJS.Timeout | null;
		timeUpTimer: NodeJS.Timeout | null;
		disqualifiedFromRound: Set<User>;
	}

	/**
	 * The game state after a tag has been posted,
	 * and other players can race to match the tag.
	 *
	 * The players who posted the tag are not allowed post the match.
	 */
	type GameStateAwaitingMatch = {
		status: 'awaiting-match';
		scores: Scores;
		tag: Message;
		disqualifiedFromRound: Set<User>;
	}

	/**
	 * The game state when the channel is tracked but there is no active game.
	 */
	type GameStateInactive = {
		status: 'inactive';
	}

	/**
	 * A period over which the game can run and potentially automatically
	 * restart.
	 */
	type Period = 'hour' | 'month' | null;

	/**
	 * A ranking strategy.
	 *
	 * See https://en.wikipedia.org/wiki/Ranking#Strategies_for_assigning_rankings
	 */

	type RankingStrategy = 'standardCompetition' | 'modifiedCompetition' | 'dense';

	/**
	 * Configuration for a particular tag game.
	 */
	type Config = {
		/**
		 * The time in milliseconds a user has after posting a match to post the next
		 * tag.
		 */
		nextTagTimeLimit: number | null;

		/**
		 * Tag judge roles for this game.
		 */
		tagJudgeRoles: Set<Role>;

		/**
		 * Channel in which chat and announcements about the game happen.
		 */
		chatChannel: TextChannel | null;

		/**
		 * Whether the game automatically restarts when a period wraps.
		 */
		autoRestart: boolean;

		/**
		 * Period on which the game takes place.
		 */
		period: Period;

		/**
		 * Locale in which to interpret the game period.
		 */
		locale: string;

		/**
		 * Ranking strategy to use.
		 */
		rankingStrategy: RankingStrategy;
	}

	/**
	 * Serialized version of Config
	 */
	type SerializedConfig = {
		nextTagTimeLimit: number | null;
		tagJudgeRoleIds: string[];
		chatChannelId: string | null;
		autoRestart: boolean;
		period: Period;
		locale: string;
		rankingStrategy: RankingStrategy | null;
	}

	/**
	 * A current scoresheet for a particular tag game.
	 * The scores are not sorted.
	 */
	type Scores = Map<User, number>;

	/**
	 * A list of changed scores.
	 * The scores are not sorted.
	 */
	type ScoreChanges = Map<User, { before: number, after: number }>;

	type PartialBy<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

	namespace jest {
		interface Matchers<R> {
			toBeFunctionWithName: (name: string) => void;
		}

		interface Expect {
			toBeFunctionWithName: (name: string) => void;
		}
	}

}
