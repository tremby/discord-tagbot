import init from './init';
import forget from './forget';
import archiveChannel from './archive-channel';
import unarchiveChannel from './unarchive-channel';
import recount from './recount';
import addJudgeRole from './add-judge-role';
import removeJudgeRole from './remove-judge-role';
import setNextTagTimeLimit from './set-next-tag-time-limit';
import chatChannel from './chat-channel';
import disqualified from './disqualified';
import showStatus from './show-status';
import showConfig from './show-config';

const commands: SlashCommandSpec[] = [
	init,
	forget,
	archiveChannel,
	unarchiveChannel,
	recount,
	addJudgeRole,
	removeJudgeRole,
	setNextTagTimeLimit,
	chatChannel,
	disqualified,
	showStatus,
	showConfig,
	// Remember to update the readme
];

export default commands;
