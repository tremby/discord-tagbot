import init from './init';
import forget from './forget';
import archiveChannel from './archive-channel';
import unarchiveChannel from './unarchive-channel';
import recount from './recount';
import judgeRole from './judge-role';
import timeLimit from './time-limit';
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
	judgeRole,
	timeLimit,
	chatChannel,
	disqualified,
	showStatus,
	showConfig,
	// Remember to update the readme
];

export default commands;
