import init from './init';
import forget from './forget';
import archiveChannel from './archive-channel';
import unarchiveChannel from './unarchive-channel';
import recount from './recount';
import judgeRole from './judge-role';
import setNextTagTimeLimit from './set-next-tag-time-limit';
import chatChannel from './chat-channel';
import disqualified from './disqualified';
import showStatus from './show-status';
import config from './config';

const commands: SlashCommandSpec[] = [
	init,
	forget,
	archiveChannel,
	unarchiveChannel,
	recount,
	judgeRole,
	setNextTagTimeLimit,
	chatChannel,
	disqualified,
	showStatus,
	config,
	// Remember to update the readme
];

export default commands;
