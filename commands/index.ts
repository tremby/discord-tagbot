import addChannel from './add-channel';
import removeChannel from './remove-channel';
import archiveChannel from './archive-channel';
import unarchiveChannel from './unarchive-channel';
import recount from './recount';
import addJudgeRole from './add-judge-role';
import removeJudgeRole from './remove-judge-role';
import setNextTagTimeLimit from './set-next-tag-time-limit';
import setChatChannel from './set-chat-channel';
import clearChatChannel from './clear-chat-channel';
import disqualified from './disqualified';
import showStatus from './show-status';
import showConfig from './show-config';

const commands: SlashCommandSpec[] = [
	addChannel,
	removeChannel,
	archiveChannel,
	unarchiveChannel,
	recount,
	addJudgeRole,
	removeJudgeRole,
	setNextTagTimeLimit,
	setChatChannel,
	clearChatChannel,
	disqualified,
	showStatus,
	showConfig,
	// Remember to update the readme
];

export default commands;
