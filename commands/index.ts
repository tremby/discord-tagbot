import init from './init';
import forget from './forget';
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
