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
import excludedAdd from './excluded-add';
import excludedRemove from './excluded-remove';
import excludedClear from './excluded-clear';
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
	excludedAdd,
	excludedRemove,
	excludedClear,
	showStatus,
	showConfig,
	// Remember to update the readme
];

export default commands;
