import addChannel from './add-channel';
import removeChannel from './remove-channel';
import archiveChannel from './archive-channel';
import unarchiveChannel from './unarchive-channel';
import recountChannel from './recount-channel';
import addJudgeRole from './add-judge-role';
import removeJudgeRole from './remove-judge-role';
import setNextTagTimeLimit from './set-next-tag-time-limit';
import setChatChannel from './set-chat-channel';
import clearChatChannel from './clear-chat-channel';
import disqualifiedAdd from './disqualified-add';
import disqualifiedRemove from './disqualified-remove';
import disqualifiedClear from './disqualified-clear';
import showStatus from './show-status';
import showConfig from './show-config';

const commands: SlashCommandSpec[] = [
	addChannel,
	removeChannel,
	archiveChannel,
	unarchiveChannel,
	recountChannel,
	addJudgeRole,
	removeJudgeRole,
	setNextTagTimeLimit,
	setChatChannel,
	clearChatChannel,
	disqualifiedAdd,
	disqualifiedRemove,
	disqualifiedClear,
	showStatus,
	showConfig,
	// Remember to update the readme
];

export default commands;
